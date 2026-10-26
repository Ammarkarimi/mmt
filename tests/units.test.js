import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildDemoData } from '../server/db/seed.js';
import { hashPassword, signToken, verifyPassword, verifyToken } from '../server/lib/security.js';
import { int, list, obj, str, validate } from '../server/lib/validate.js';
import { applyCoupon } from '../server/services/coupons.js';
import { refundQuote } from '../server/services/policies.js';
import { extraAdults, fitsRoomType, gstRate, priceStay } from '../server/services/pricing.js';

const rt = { base_price: 4000, weekend_price: 5000, base_occupancy: 2, max_adults: 3, max_children: 2, max_occupancy: 4, extra_adult_price: 800 };
const plan = (delta = 0) => ({ price_delta: delta });

test('GST slab is chosen per room per night', () => {
  assert.equal(gstRate(1000), 5);
  assert.equal(gstRate(7500), 5);
  assert.equal(gstRate(7501), 18);
});

test('guests are spread across rooms for occupancy and extra-adult charges', () => {
  assert.equal(fitsRoomType(rt, 1, 3, 1), true);
  assert.equal(fitsRoomType(rt, 1, 4, 0), false); // max 3 adults per room
  assert.equal(fitsRoomType(rt, 2, 1, 0), false); // every room needs an adult
  assert.equal(fitsRoomType(rt, 1, 3, 2), false); // 5 guests > max occupancy 4
  assert.equal(extraAdults(rt, 1, 3), 1);
  assert.equal(extraAdults(rt, 2, 5), 1); // 3 + 2
  assert.equal(extraAdults(rt, 2, 4), 0);
});

test('stay price uses weekend rates, overrides, plan deltas, extra adults and GST', () => {
  // 2026-11-05 is a Thursday, 2026-11-06 a Friday, 2026-11-07 a Saturday.
  const nights = [{ date: '2026-11-05', price: null }, { date: '2026-11-06', price: null }, { date: '2026-11-07', price: 9000 }];
  const p = priceStay({ rt, plan: plan(500), nights, rooms: 1, adults: 3 });
  assert.deepEqual(p.nights.map((n) => n.roomRate), [4500, 5500, 9500]);
  assert.deepEqual(p.nights.map((n) => n.amount), [5300, 6300, 10300]);
  assert.deepEqual(p.nights.map((n) => n.taxRate), [5, 5, 18]);
  assert.equal(p.roomCharges, 21900);
  assert.equal(p.taxes, 265 + 315 + 1854);
  assert.equal(p.gross, 21900 + 2434);
});

test('coupons follow caps, minimums and category limits', () => {
  assert.equal(applyCoupon('tsstay', { gross: 50000, category: 'hotel' }).discount, 2000);
  assert.equal(applyCoupon('TSSTAY', { gross: 5000, category: 'hotel' }).discount, 1000);
  assert.match(applyCoupon('TSHOME', { gross: 5000, category: 'hotel' }).error, /homestays/);
  assert.equal(applyCoupon('TSHOME', { gross: 5000, category: 'homestay' }).discount, 500);
  assert.match(applyCoupon('TSUPI', { gross: 1500, category: 'hotel' }).error, /minimum/);
  assert.match(applyCoupon('NOPE', { gross: 5000, category: 'hotel' }).error, /not valid/);
});

test('refunds follow the cancellation policy', () => {
  const pricing = { gross: 11000, nights: [{ amount: 5000, tax: 500 }, { amount: 5000, tax: 500 }] };
  const booking = (policy, total = 11000) => ({ status: 'confirmed', total_amount: total, cancellation_policy: policy, check_in: '2026-12-10', pricing, snapshot: { checkInTime: '14:00' } });
  const at = (iso) => new Date(iso);
  assert.equal(refundQuote(booking('flexible'), at('2026-12-01T10:00:00+05:30')).refund, 11000);
  assert.equal(refundQuote(booking('flexible'), at('2026-12-10T09:00:00+05:30')).refund, 5500); // first night charged
  assert.equal(refundQuote(booking('flexible', 9900), at('2026-12-10T09:00:00+05:30')).penalty, 4950); // coupon-adjusted
  assert.equal(refundQuote(booking('moderate'), at('2026-12-07T10:00:00+05:30')).refund, 5500);
  assert.equal(refundQuote(booking('non_refundable'), at('2026-12-01T10:00:00+05:30')).refund, 0);
  assert.equal(refundQuote(booking('flexible'), at('2026-12-10T15:00:00+05:30')).allowed, false);
  assert.equal(refundQuote({ ...booking('flexible'), status: 'held' }).refund, 0);
});

test('tokens are signed, expire and resist tampering', async () => {
  const t = signToken({ sub: 'u1', role: 'customer' }, 'k'.repeat(40), 60);
  assert.equal(verifyToken(t, 'k'.repeat(40)).sub, 'u1');
  assert.equal(verifyToken(t, 'x'.repeat(40)), null);
  const [h, , s] = t.split('.');
  const forged = Buffer.from(JSON.stringify({ sub: 'admin', role: 'admin', exp: 9e9 })).toString('base64url');
  assert.equal(verifyToken(`${h}.${forged}.${s}`, 'k'.repeat(40)), null);
  assert.equal(verifyToken(signToken({ sub: 'u1' }, 'k'.repeat(40), -10), 'k'.repeat(40)), null);
  const hash = await hashPassword('hunter22');
  assert.equal(await verifyPassword('hunter22', hash), true);
  assert.equal(await verifyPassword('hunter23', hash), false);
});

test('validator reports every invalid field', () => {
  assert.throws(() => validate({ a: 'x', b: 'nope' }, { a: str({ min: 2 }), b: int(), c: str({ required: true }) }), (e) => e.status === 400 && Object.keys(e.details).length === 3);
  assert.deepEqual(validate({ tags: ['a', 'a', ' b '] }, { tags: list(str(), { unique: true }) }), { tags: ['a', 'b'] });
  assert.throws(() => validate({ o: { n: 'x' } }, { o: obj({ n: int() }) }), /o n must be a whole number/);
});

test('demo data is deterministic and internally consistent', () => {
  const a = buildDemoData(new Date('2026-10-01'));
  const b = buildDemoData(new Date('2026-10-01'));
  assert.deepEqual(a, b);
  const ids = new Set(a.properties.map((p) => p.id));
  assert.equal(ids.size, a.properties.length);
  const roomIds = new Set(a.rooms.map((r) => r.id));
  assert.ok(a.rooms.every((r) => ids.has(r.property_id)));
  assert.ok(a.plans.every((p) => roomIds.has(p.room_type_id)));
  assert.ok(a.rooms.every((r) => a.plans.some((p) => p.room_type_id === r.id)));
  assert.ok(a.rooms.every((r) => a.plans.filter((p) => p.room_type_id === r.id).every((p) => r.base_price + p.price_delta > 100)));
});
