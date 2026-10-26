/*
 * End-to-end API tests: partner onboarding → admin review → search → booking → payment →
 * cancellation, plus permissions, inventory races, hold expiry and the rates calendar.
 */
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { addDays } from '../server/lib/dates.js';
import { FULL_DETAILS, adminToken, customerToken, liveProperty, nextWeekday, partnerToken, qs, startServer } from './helpers.js';

let s;
let api;
let partner;
let admin;
let guest;
let hotel; // { propertyId, roomTypeId, planIds }
const MON = nextWeekday(1, 14); // a Monday at least two weeks out
const WED = addDays(MON, 2);
const stay = { checkin: MON, checkout: WED, rooms: 1, adults: 2, children: 0 };

before(async () => {
  s = await startServer();
  api = s.api;
});
after(() => s.close());

test('health reports the database', async () => {
  const r = await api('GET', '/api/health');
  assert.equal(r.status, 200);
  assert.equal(r.data.ok, true);
  assert.ok(['pglite', 'postgres'].includes(r.data.database));
});

test('partner sign-up validates input and rejects duplicate emails', async () => {
  const weak = await api('POST', '/api/auth/partner/signup', { body: { name: 'A B', email: 'owner@seaside.test', phone: '9876543210', password: 'short' } });
  assert.equal(weak.status, 400);
  assert.ok(weak.data.error.details.password);
  partner = await partnerToken(api, 'owner@seaside.test', 'Seaside Owner');
  assert.ok(partner);
  const dup = await api('POST', '/api/auth/partner/signup', { body: { name: 'X Y', email: 'OWNER@seaside.test', phone: '9876543210', password: 'another-pass-2' } });
  assert.equal(dup.status, 409);
  const login = await api('POST', '/api/auth/login', { body: { email: 'owner@seaside.test', password: 'wrong-password' } });
  assert.equal(login.status, 401);
  admin = await adminToken(api);
  assert.ok(admin);
});

test('customer OTP login: wrong code fails, demo code signs in', async () => {
  const otp = await api('POST', '/api/auth/otp', { body: { phone: '9811122233' } });
  assert.equal(otp.status, 200);
  assert.match(otp.data.demoCode, /^\d{6}$/);
  const wrongCode = otp.data.demoCode === '000000' ? '111111' : '000000';
  const bad = await api('POST', '/api/auth/otp/verify', { body: { phone: '9811122233', code: wrongCode } });
  assert.equal(bad.status, 401);
  const ok = await api('POST', '/api/auth/otp/verify', { body: { phone: '9811122233', code: otp.data.demoCode, name: 'Priya Nair' } });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.user.role, 'customer');
  assert.equal(ok.data.user.name, 'Priya Nair');
  guest = ok.data.token;
  const reuse = await api('POST', '/api/auth/otp/verify', { body: { phone: '9811122233', code: otp.data.demoCode } });
  assert.equal(reuse.status, 401);
  const me = await api('GET', '/api/me', { token: guest });
  assert.equal(me.data.user.phone, '9811122233');
});

test('roles are enforced', async () => {
  assert.equal((await api('GET', '/api/partner/properties')).status, 401);
  assert.equal((await api('GET', '/api/partner/properties', { token: guest })).status, 403);
  assert.equal((await api('GET', '/api/admin/properties', { token: partner })).status, 403);
  assert.equal((await api('GET', '/api/bookings', { token: partner })).status, 403);
  assert.equal((await api('GET', '/api/partner/properties', { token: 'not-a-token' })).status, 401);
});

let propertyId;
test('a new property starts as a draft with an onboarding checklist', async () => {
  const r = await api('POST', '/api/partner/properties', { token: partner, body: { name: 'Seaside Courtyard', category: 'hotel' } });
  assert.equal(r.status, 201);
  propertyId = r.data.property.id;
  assert.equal(r.data.property.status, 'draft');
  assert.equal(r.data.checklist.complete, false);
  const submit = await api('POST', `/api/partner/properties/${propertyId}/submit`, { token: partner });
  assert.equal(submit.status, 422);
  assert.ok(submit.data.error.details.missing.length >= 5);
});

test('property details are validated and bank details are masked', async () => {
  const bad = await api('PATCH', `/api/partner/properties/${propertyId}`, { token: partner, body: { legal: { pan: 'ABC' }, checkInTime: '25:00', amenities: ['wifi', 'helipad'] } });
  assert.equal(bad.status, 400);
  assert.deepEqual(Object.keys(bad.data.error.details).sort(), ['amenities', 'checkInTime', 'legal']);
  const wrongType = await api('PATCH', `/api/partner/properties/${propertyId}`, { token: partner, body: { propertyType: 'Villa' } });
  assert.equal(wrongType.status, 400);
  const ok = await api('PATCH', `/api/partner/properties/${propertyId}`, { token: partner, body: { ...FULL_DETAILS, city: 'Goa' } });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.property.legal.accountNumber, undefined);
  assert.equal(ok.data.property.legal.accountNumberMasked, '••••••••9012');
  assert.equal(ok.data.property.policies.coupleFriendly, true);
  // JSON fields merge rather than replace
  const merged = await api('PATCH', `/api/partner/properties/${propertyId}`, { token: partner, body: { policies: { petsAllowed: true } } });
  assert.equal(merged.data.property.policies.coupleFriendly, true);
  assert.equal(merged.data.property.policies.petsAllowed, true);
  assert.equal(merged.data.checklist.items.find((i) => i.key === 'rooms').done, false);
});

test('rooms and rate plans are validated', async () => {
  const bad = await api('POST', `/api/partner/properties/${propertyId}/rooms`, { token: partner, body: { name: 'Suite', totalRooms: 2, basePrice: 5000, maxAdults: 5, maxOccupancy: 3 } });
  assert.equal(bad.status, 400);
  const cheap = await api('POST', `/api/partner/properties/${propertyId}/rooms`, { token: partner, body: { name: 'Suite', totalRooms: 2, basePrice: 500, ratePlans: [{ name: 'Promo', priceDelta: -450 }] } });
  assert.equal(cheap.status, 400);
  const ok = await api('POST', `/api/partner/properties/${propertyId}/rooms`, { token: partner, body: { name: 'Garden Room', totalRooms: 4, basePrice: 3500, amenities: ['TV', 'Balcony'] } });
  assert.equal(ok.status, 201);
  assert.equal(ok.data.rooms[0].ratePlans[0].name, 'Room Only'); // default plan
  assert.equal(ok.data.checklist.complete, true);
});

test('other partners cannot see or edit the property', async () => {
  const other = await partnerToken(api, 'someone@else.test');
  assert.equal((await api('GET', `/api/partner/properties/${propertyId}`, { token: other })).status, 404);
  assert.equal((await api('PATCH', `/api/partner/properties/${propertyId}`, { token: other, body: { name: 'Hijacked' } })).status, 404);
});

test('submission, rejection, resubmission and approval', async () => {
  const sub = await api('POST', `/api/partner/properties/${propertyId}/submit`, { token: partner });
  assert.equal(sub.status, 200);
  assert.equal(sub.data.property.status, 'pending_review');
  const hidden = await api('GET', `/api/hotels/search?${qs({ city: 'Goa', ...stay })}`);
  assert.ok(!hidden.data.results.some((h) => h.id === propertyId));
  assert.equal((await api('GET', `/api/hotels/${propertyId}`)).status, 404);

  const queue = await api('GET', '/api/admin/properties?status=pending_review', { token: admin });
  assert.ok(queue.data.properties.some((p) => p.id === propertyId));
  assert.equal((await api('POST', `/api/admin/properties/${propertyId}/reject`, { token: admin, body: { reason: 'no' } })).status, 400);
  const rej = await api('POST', `/api/admin/properties/${propertyId}/reject`, { token: admin, body: { reason: 'Please add a clearer description of the rooms.' } });
  assert.equal(rej.data.property.status, 'rejected');
  assert.match(rej.data.property.reviewNote, /clearer description/);

  await api('POST', `/api/partner/properties/${propertyId}/submit`, { token: partner });
  const appr = await api('POST', `/api/admin/properties/${propertyId}/approve`, { token: admin, body: { commissionPct: 12 } });
  assert.equal(appr.status, 200);
  assert.equal(appr.data.property.status, 'live');
  assert.equal(appr.data.property.commissionPct, 12);
  assert.deepEqual(appr.data.events.map((e) => e.action), ['created', 'submitted', 'rejected', 'submitted', 'approved']);
  assert.equal((await api('POST', `/api/admin/properties/${propertyId}/approve`, { token: admin, body: {} })).status, 409);
});

test('live property appears in search with server-side prices', async () => {
  const r = await api('GET', `/api/hotels/search?${qs({ city: 'goa', ...stay })}`);
  assert.equal(r.status, 200);
  const card = r.data.results.find((h) => h.id === propertyId);
  assert.ok(card);
  assert.equal(card.perNight, 3500);
  assert.equal(card.perNightTax, 175);
  assert.equal(card.stayTotal, 7350);
  assert.ok(card.tags.includes('Free Cancellation'));
  assert.ok(card.tags.includes('Couple Friendly'));
  const detail = await api('GET', `/api/hotels/${propertyId}?${qs(stay)}`);
  assert.equal(detail.data.rooms.length, 1);
  assert.equal(detail.data.rooms[0].available, 4);
  assert.equal(detail.data.rooms[0].totalRooms, undefined); // inventory size stays private
  assert.equal(detail.data.property.legal, undefined);
});

test('search validates dates', async () => {
  assert.equal((await api('GET', `/api/hotels/search?${qs({ city: 'Goa', checkin: '2020-01-01', checkout: '2020-01-02' })}`)).status, 400);
  assert.equal((await api('GET', `/api/hotels/search?${qs({ city: 'Goa', checkin: WED, checkout: MON })}`)).status, 400);
  assert.equal((await api('GET', `/api/hotels/search?${qs({ city: 'Goa', checkin: MON, checkout: addDays(MON, 31) })}`)).status, 400);
  assert.equal((await api('GET', `/api/hotels/search?${qs({ city: 'Goa', checkin: 'tomorrow' })}`)).status, 400);
});

test('quote, coupons and full booking with payment', async () => {
  hotel = await liveProperty(api, partner, admin, { name: 'Harbour View Hotel', city: 'Goa' });
  const sel = { propertyId: hotel.propertyId, roomTypeId: hotel.roomTypeId, ratePlanId: hotel.planIds[1], ...stay, adults: 3 };
  const q = await api('POST', '/api/bookings/quote', { body: { ...sel, coupon: 'TSSTAY' } });
  assert.equal(q.status, 200);
  // (4000 + 500 breakfast + 800 extra adult) × 2 nights, 5% GST
  assert.equal(q.data.quote.price.roomCharges, 10600);
  assert.equal(q.data.quote.price.taxes, 530);
  assert.equal(q.data.quote.price.discount, 2000);
  assert.equal(q.data.quote.price.total, 9130);
  assert.equal(q.data.quote.price.payout, undefined); // partner economics are not shown to guests
  assert.ok(q.data.quote.coupons.find((c) => c.code === 'TSHOME' && !c.eligible));

  assert.equal((await api('POST', '/api/bookings', { body: { ...sel, guest: {} } })).status, 401);
  const badGuest = await api('POST', '/api/bookings', { token: guest, body: { ...sel, guest: { firstName: 'P', lastName: '', email: 'x', phone: '123' } } });
  assert.equal(badGuest.status, 400);
  const badCoupon = await api('POST', '/api/bookings', { token: guest, body: { ...sel, coupon: 'TSHOME', guest: { firstName: 'Priya', lastName: 'Nair', email: 'priya@example.com', phone: '9811122233' } } });
  assert.equal(badCoupon.status, 400);

  const hold = await api('POST', '/api/bookings', { token: guest, body: { ...sel, coupon: 'TSSTAY', guest: { firstName: 'Priya', lastName: 'Nair', gender: 'F', email: 'priya@example.com', phone: '9811122233' }, specialRequests: 'Late check-in' } });
  assert.equal(hold.status, 201);
  const b = hold.data.booking;
  assert.equal(b.status, 'held');
  assert.equal(b.price.total, 9130);
  assert.match(b.id, /^TSH[0-9A-Z]{9}$/);
  assert.ok(new Date(b.holdExpiresAt) > new Date());

  const cal = await api('GET', `/api/partner/rooms/${hotel.roomTypeId}/calendar?${qs({ from: MON, days: 3 })}`, { token: partner });
  assert.deepEqual(cal.data.days.map((d) => d.sold), [1, 1, 0]);

  const declined = await api('POST', `/api/bookings/${b.id}/pay`, { token: guest, body: { method: 'card', cardLast4: '0002' } });
  assert.equal(declined.status, 402);
  const paid = await api('POST', `/api/bookings/${b.id}/pay`, { token: guest, body: { method: 'upi', upiId: 'priya@okbank' } });
  assert.equal(paid.status, 200);
  assert.equal(paid.data.booking.status, 'confirmed');
  assert.equal(paid.data.booking.stage, 'upcoming');
  const again = await api('POST', `/api/bookings/${b.id}/pay`, { token: guest, body: { method: 'upi' } });
  assert.equal(again.data.booking.status, 'confirmed');
  const { rows } = await s.db.query("SELECT kind, status FROM payments WHERE booking_id = $1 ORDER BY created_at", [b.id]);
  assert.deepEqual(rows.map((x) => x.status), ['failed', 'succeeded']);

  const mine = await api('GET', '/api/bookings', { token: guest });
  assert.equal(mine.data.bookings[0].id, b.id);
  assert.equal(mine.data.bookings[0].property.name, 'Harbour View Hotel');

  const pb = await api('GET', `/api/partner/bookings?propertyId=${hotel.propertyId}`, { token: partner });
  assert.equal(pb.data.bookings[0].id, b.id);
  assert.equal(pb.data.bookings[0].commission, 1590); // 15% of room charges
  assert.equal(pb.data.bookings[0].payout, 10600 + 530 - 1590);
  const dash = await api('GET', '/api/partner/dashboard', { token: partner });
  assert.equal(dash.data.totals.confirmed, 1);
  assert.equal(dash.data.properties.length, 2);
  assert.equal(dash.data.arrivals[0].id, b.id);

  const other = await customerToken(api, '9700000001');
  assert.equal((await api('GET', `/api/bookings/${b.id}`, { token: other })).status, 404);
});

test('the last room cannot be sold twice, even concurrently', async () => {
  const solo = await liveProperty(api, partner, admin, { name: 'One Room Cabin', city: 'Goa', room: { name: 'Cabin', totalRooms: 1 } });
  const body = { propertyId: solo.propertyId, roomTypeId: solo.roomTypeId, ratePlanId: solo.planIds[0], ...stay, guest: { firstName: 'Guest', lastName: 'One', email: 'g@example.com', phone: '9811100000' } };
  const tokens = await Promise.all(['9811100001', '9811100002', '9811100003', '9811100004'].map((p) => customerToken(api, p)));
  const results = await Promise.all(tokens.map((token) => api('POST', '/api/bookings', { token, body })));
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409, 409, 409]);
  assert.ok(results.filter((r) => r.status === 409).every((r) => r.data.error.code === 'sold_out'));
  const overlap = await api('POST', '/api/bookings', { token: tokens[0], body: { ...body, checkin: addDays(MON, 1), checkout: addDays(MON, 3) } });
  assert.equal(overlap.status, 409);
  const after = await api('POST', '/api/bookings', { token: tokens[0], body: { ...body, checkin: WED, checkout: addDays(WED, 1) } });
  assert.equal(after.status, 201); // the next night is free
  const search = await api('GET', `/api/hotels/search?${qs({ city: 'Goa', ...stay })}`);
  const card = search.data.results.find((h) => h.id === solo.propertyId);
  assert.equal(card.soldOut, true);
  assert.equal(search.data.results.at(-1).soldOut, true); // sold-out listings sort last
});

test('expired holds release their rooms and cannot be paid', async () => {
  const t = await customerToken(api, '9811133344');
  const sel = { propertyId: hotel.propertyId, roomTypeId: hotel.roomTypeId, ratePlanId: hotel.planIds[0], checkin: addDays(MON, 7), checkout: addDays(MON, 8), rooms: 2, adults: 2 };
  const hold = await api('POST', '/api/bookings', { token: t, body: { ...sel, guest: { firstName: 'Late', lastName: 'Payer', email: 'late@example.com', phone: '9811133344' } } });
  assert.equal(hold.status, 201);
  const before = await api('POST', '/api/bookings/quote', { body: sel });
  assert.equal(before.data.quote.available, 3);
  await s.db.query("UPDATE bookings SET hold_expires_at = now() - interval '1 minute' WHERE id = $1", [hold.data.booking.id]);
  const pay = await api('POST', `/api/bookings/${hold.data.booking.id}/pay`, { token: t, body: { method: 'upi' } });
  assert.equal(pay.status, 410);
  const restored = await api('POST', '/api/bookings/quote', { body: sel });
  assert.equal(restored.data.quote.available, 5);
});

test('a guest can only hold a few bookings at once', async () => {
  const t = await customerToken(api, '9811155566');
  const base = { propertyId: hotel.propertyId, roomTypeId: hotel.roomTypeId, ratePlanId: hotel.planIds[0], rooms: 1, adults: 2, guest: { firstName: 'Busy', lastName: 'Bee', email: 'bee@example.com', phone: '9811155566' } };
  for (let i = 0; i < 3; i++) {
    const r = await api('POST', '/api/bookings', { token: t, body: { ...base, checkin: addDays(MON, 20 + i), checkout: addDays(MON, 21 + i) } });
    assert.equal(r.status, 201);
  }
  const fourth = await api('POST', '/api/bookings', { token: t, body: { ...base, checkin: addDays(MON, 30), checkout: addDays(MON, 31) } });
  assert.equal(fourth.status, 409);
  assert.equal(fourth.data.error.code, 'too_many_holds');
});

test('cancellation refunds per policy and frees the rooms', async () => {
  const t = await customerToken(api, '9811177788');
  const sel = { propertyId: hotel.propertyId, roomTypeId: hotel.roomTypeId, ratePlanId: hotel.planIds[0], checkin: addDays(MON, 10), checkout: addDays(MON, 12), rooms: 1, adults: 2 };
  const hold = await api('POST', '/api/bookings', { token: t, body: { ...sel, guest: { firstName: 'Ravi', lastName: 'Kumar', email: 'ravi@example.com', phone: '9811177788' } } });
  const id = hold.data.booking.id;
  await api('POST', `/api/bookings/${id}/pay`, { token: t, body: { method: 'netbanking', bank: 'Ganga Bank' } });
  const preview = await api('GET', `/api/bookings/${id}/cancellation`, { token: t });
  assert.equal(preview.data.allowed, true);
  assert.equal(preview.data.refund, hold.data.booking.price.total); // flexible policy, well ahead of check-in
  const c = await api('POST', `/api/bookings/${id}/cancel`, { token: t, body: { reason: 'Change of plans' } });
  assert.equal(c.data.booking.status, 'cancelled');
  assert.equal(c.data.booking.refundAmount, hold.data.booking.price.total);
  assert.equal((await api('POST', `/api/bookings/${id}/cancel`, { token: t, body: {} })).status, 409);
  const q = await api('POST', '/api/bookings/quote', { body: sel });
  assert.equal(q.data.quote.available, 5);
  const { rows } = await s.db.query("SELECT kind, amount FROM payments WHERE booking_id = $1 AND kind = 'refund'", [id]);
  assert.equal(rows[0].amount, hold.data.booking.price.total);
});

test('rates calendar: price overrides, stop-sell and inventory limits', async () => {
  const day = addDays(MON, 40);
  const sel = { propertyId: hotel.propertyId, roomTypeId: hotel.roomTypeId, ratePlanId: hotel.planIds[0], checkin: day, checkout: addDays(day, 1), rooms: 1, adults: 2 };
  const priced = await api('PUT', `/api/partner/rooms/${hotel.roomTypeId}/calendar`, { token: partner, body: { from: day, to: day, price: 6000 } });
  assert.equal(priced.data.updated, 1);
  assert.equal((await api('POST', '/api/bookings/quote', { body: sel })).data.quote.price.roomCharges, 6000);

  await api('PUT', `/api/partner/rooms/${hotel.roomTypeId}/calendar`, { token: partner, body: { from: day, to: day, stopSell: true } });
  const closed = await api('POST', '/api/bookings/quote', { body: sel });
  assert.equal(closed.data.quote.soldOut, true);
  const t = await customerToken(api, '9811199900');
  const tryBook = await api('POST', '/api/bookings', { token: t, body: { ...sel, guest: { firstName: 'Stop', lastName: 'Sell', email: 's@example.com', phone: '9811199900' } } });
  assert.equal(tryBook.status, 409);
  await api('PUT', `/api/partner/rooms/${hotel.roomTypeId}/calendar`, { token: partner, body: { from: day, to: day, stopSell: false, price: null } });
  assert.equal((await api('POST', '/api/bookings/quote', { body: sel })).data.quote.price.roomCharges, 4000);

  // Monday-only weekday filter over two weeks touches exactly two dates.
  const weekly = await api('PUT', `/api/partner/rooms/${hotel.roomTypeId}/calendar`, { token: partner, body: { from: addDays(MON, 42), to: addDays(MON, 55), weekdays: [1], total: 2 } });
  assert.equal(weekly.data.updated, 2);

  // Can't cut inventory below rooms already sold.
  assert.equal((await api('PUT', `/api/partner/rooms/${hotel.roomTypeId}/calendar`, { token: partner, body: { from: MON, to: MON, total: 0 } })).status, 409);
  assert.equal((await api('PATCH', `/api/partner/rooms/${hotel.roomTypeId}`, { token: partner, body: { totalRooms: 0 } })).status, 400);
  assert.equal((await api('PUT', `/api/partner/rooms/${hotel.roomTypeId}/calendar`, { token: partner, body: { from: '2020-01-01', to: '2020-01-02', price: 5000 } })).status, 400);
});

test('rate plans can be edited without breaking existing bookings', async () => {
  const before = (await api('GET', `/api/partner/properties/${hotel.propertyId}`, { token: partner })).data.rooms[0];
  const res = await api('PATCH', `/api/partner/rooms/${hotel.roomTypeId}`, {
    token: partner,
    body: { ratePlans: [{ id: before.ratePlans[0].id, name: 'Room Only', mealPlan: 'EP', priceDelta: 0, refundable: true }, { name: 'Half Board', mealPlan: 'MAP', priceDelta: 1500, refundable: false }] },
  });
  assert.equal(res.status, 200);
  const plans = res.data.rooms[0].ratePlans;
  assert.deepEqual(plans.map((p) => p.name), ['Room Only', 'Half Board']);
  const mine = await api('GET', '/api/bookings', { token: guest });
  assert.equal(mine.data.bookings[0].plan.name, 'With Breakfast'); // snapshot survives
  const detail = await api('GET', `/api/hotels/${hotel.propertyId}?${qs(stay)}`);
  const half = detail.data.rooms[0].ratePlans.find((p) => p.name === 'Half Board');
  assert.equal(half.policy.key, 'non_refundable');
});

test('guests can review a completed stay once', async () => {
  const mine = await api('GET', '/api/bookings', { token: guest });
  const id = mine.data.bookings[0].id;
  assert.equal((await api('POST', `/api/bookings/${id}/review`, { token: guest, body: { rating: 5 } })).status, 409);
  await s.db.query("UPDATE bookings SET check_in = current_date - 3, check_out = current_date - 1 WHERE id = $1", [id]);
  const ok = await api('POST', `/api/bookings/${id}/review`, { token: guest, body: { rating: 4, comment: 'Lovely harbour view.' } });
  assert.equal(ok.status, 201);
  assert.equal((await api('POST', `/api/bookings/${id}/review`, { token: guest, body: { rating: 5 } })).status, 409);
  const detail = await api('GET', `/api/hotels/${hotel.propertyId}`);
  assert.equal(detail.data.property.rating, 4);
  assert.equal(detail.data.property.ratingCount, 1);
  assert.equal(detail.data.reviews[0].comment, 'Lovely harbour view.');
  const refreshed = await api('GET', '/api/bookings', { token: guest });
  assert.equal(refreshed.data.bookings[0].stage, 'completed');
  assert.equal(refreshed.data.bookings[0].reviewed, true);
});

test('admin can suspend, reinstate and cancel with a full refund', async () => {
  await api('POST', `/api/admin/properties/${hotel.propertyId}/suspend`, { token: admin, body: { reason: 'Guest complaints under investigation' } });
  const hidden = await api('GET', `/api/hotels/search?${qs({ city: 'Goa', ...stay })}`);
  assert.ok(!hidden.data.results.some((h) => h.id === hotel.propertyId));
  assert.equal((await api('PATCH', `/api/partner/properties/${hotel.propertyId}`, { token: partner, body: { name: 'Renamed' } })).status, 409);
  await api('POST', `/api/admin/properties/${hotel.propertyId}/reinstate`, { token: admin });
  assert.ok((await api('GET', `/api/hotels/search?${qs({ city: 'Goa', ...stay })}`)).data.results.some((h) => h.id === hotel.propertyId));

  const t = await customerToken(api, '9811188800');
  const sel = { propertyId: hotel.propertyId, roomTypeId: hotel.roomTypeId, ratePlanId: hotel.planIds[0], checkin: addDays(MON, 3), checkout: addDays(MON, 4), rooms: 1, adults: 1 };
  const hold = await api('POST', '/api/bookings', { token: t, body: { ...sel, guest: { firstName: 'Neha', lastName: 'Rao', email: 'neha@example.com', phone: '9811188800' } } });
  await api('POST', `/api/bookings/${hold.data.booking.id}/pay`, { token: t, body: { method: 'card', cardLast4: '4242' } });
  const c = await api('POST', `/api/admin/bookings/${hold.data.booking.id}/cancel`, { token: admin, body: { reason: 'Property overbooked offline' } });
  assert.equal(c.data.booking.status, 'cancelled');
  assert.equal(c.data.booking.cancelledBy, 'admin');
  assert.equal(c.data.booking.refundAmount, hold.data.booking.price.total);
  const stats = await api('GET', '/api/admin/stats', { token: admin });
  assert.ok(stats.data.bookings.confirmed >= 1);
  assert.ok(stats.data.properties.live >= 3);
});

test('unknown routes and bad bodies get clean errors', async () => {
  assert.equal((await api('GET', '/api/nope')).status, 404);
  assert.equal((await api('DELETE', '/api/health')).status, 405);
  const badJson = await fetch(`${s.base}/api/auth/otp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad json' });
  assert.equal(badJson.status, 400);
  const form = await fetch(`${s.base}/api/auth/otp`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'phone=9811122233' });
  assert.equal(form.status, 415);
});
