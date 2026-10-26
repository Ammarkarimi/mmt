/*
 * Guest booking flow:
 *   1. POST /api/bookings/quote       – authoritative price for a room + rate plan (+ coupon)
 *   2. POST /api/bookings             – hold the rooms for HOLD_MINUTES while the guest pays
 *   3. POST /api/bookings/:id/pay     – charge through the payment gateway → confirmed
 *   4. POST /api/bookings/:id/cancel  – cancel with a refund according to the rate plan's policy
 */
import { HttpError, badRequest, conflict, notFound } from '../http.js';
import { todayIST } from '../lib/dates.js';
import { newBookingRef, newId } from '../lib/security.js';
import { date, email, int, invalid, obj, oneOf, phone, str, text, validate } from '../lib/validate.js';
import { bookingOut, cancelBooking } from '../services/bookings.js';
import { MEAL_PLANS } from '../services/catalog.js';
import { expireHolds, release, reserve } from '../services/inventory.js';
import { checkStay, loadSelection, quoteSelection } from '../services/listings.js';
import { PAYMENT_METHODS, gateway } from '../services/payments.js';
import { refundQuote } from '../services/policies.js';

const id = (o = {}) => str({ min: 1, max: 64, ...o });
const personName = (o = {}) => str({ min: 1, max: 40, pattern: /^[A-Za-z][A-Za-z .'-]*$/, patternMsg: 'should contain letters only', ...o });

const selectionRules = {
  propertyId: id({ required: true }),
  roomTypeId: id({ required: true }),
  ratePlanId: id({ required: true }),
  checkin: date({ required: true }),
  checkout: date({ required: true }),
  rooms: int({ min: 1, max: 8, required: true }),
  adults: int({ min: 1, max: 32, required: true }),
  children: int({ min: 0, max: 16, default: 0 }),
  coupon: str({ max: 20, upper: true }),
};

function quoteOut(sel, stay, q) {
  const { property: p, room, plan } = sel;
  const { commission, commissionPct, payout, ...price } = q.price;
  return {
    property: { id: p.id, name: p.name, category: p.category, city: p.city, locality: p.locality, scene: p.scene, stars: p.star_rating, checkInTime: p.check_in_time, checkOutTime: p.check_out_time },
    room: { id: room.id, name: room.name, bedType: room.bed_type },
    plan: { id: plan.id, name: plan.name, mealPlan: plan.meal_plan, inclusions: MEAL_PLANS[plan.meal_plan].inclusions },
    stay,
    available: q.available,
    soldOut: q.available < stay.rooms,
    price,
    coupon: q.coupon,
    coupons: q.coupons,
    policy: q.policy,
  };
}

async function ownBooking(c, user, bookingId, { lock = false } = {}) {
  const { rows } = await c.query(
    `SELECT b.*, EXISTS (SELECT 1 FROM reviews r WHERE r.booking_id = b.id) AS reviewed
       FROM bookings b WHERE b.id = $1 AND b.user_id = $2${lock ? ' FOR UPDATE OF b' : ''}`,
    [bookingId, user.id],
  );
  if (!rows[0]) throw notFound('Booking');
  return rows[0];
}

export default function bookingRoutes(r) {
  r.post('/api/bookings/quote', async ({ db, body }) => {
    const v = validate(body, selectionRules);
    const stay = checkStay(v);
    await expireHolds(db);
    const sel = await loadSelection(db, v);
    return { quote: quoteOut(sel, stay, await quoteSelection(db, sel, stay, v.coupon)) };
  });

  r.post('/api/bookings', async (ctx) => {
    const { db, body, user, config } = ctx;
    const v = validate(body, {
      ...selectionRules,
      guest: obj({ firstName: personName({ required: true }), lastName: personName({ required: true }), gender: oneOf(['M', 'F']), email: email({ required: true }), phone: phone({ required: true }) }, { required: true, partial: false }),
      specialRequests: text({ max: 500, default: '' }),
    });
    const stay = checkStay(v);
    await expireHolds(db, { force: true });
    const booking = await db.tx(async (t) => {
      const holds = await t.query("SELECT count(*) AS n FROM bookings WHERE user_id = $1 AND status = 'held' AND hold_expires_at > now()", [user.id]);
      if (holds.rows[0].n >= config.maxActiveHolds) throw conflict('too_many_holds', 'You already have bookings waiting for payment. Complete or cancel them first.');
      const sel = await loadSelection(t, v);
      const q = await quoteSelection(t, sel, stay, v.coupon);
      if (v.coupon && q.coupon.error) throw badRequest(q.coupon.error, { coupon: q.coupon.error });
      await reserve(t, sel.room.id, stay.checkin, stay.checkout, stay.rooms);
      const { property: p, room, plan } = sel;
      const snapshot = {
        propertyName: p.name, category: p.category, city: p.city, locality: p.locality, address: p.address, scene: p.scene, stars: p.star_rating,
        checkInTime: p.check_in_time, checkOutTime: p.check_out_time, propertyPhone: (p.contact || {}).phone || null,
        roomName: room.name, bedType: room.bed_type, planName: plan.name, mealPlan: plan.meal_plan, inclusions: MEAL_PLANS[plan.meal_plan].inclusions,
      };
      const price = q.price;
      const { rows } = await t.query(
        `INSERT INTO bookings (id, user_id, property_id, room_type_id, rate_plan_id, check_in, check_out, nights, rooms, adults, children,
                               guest, special_requests, pricing, room_charges, taxes, discount, total_amount, coupon_code,
                               commission_pct, commission_amount, payout_amount, status, hold_expires_at, cancellation_policy, snapshot)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14::jsonb, $15, $16, $17, $18, $19, $20, $21, $22,
                 'held', now() + make_interval(mins => $23::int), $24, $25::jsonb)
         RETURNING *`,
        [newBookingRef(), user.id, p.id, room.id, plan.id, stay.checkin, stay.checkout, stay.nights, stay.rooms, stay.adults, stay.children,
          JSON.stringify(v.guest), v.specialRequests, JSON.stringify(price), price.roomCharges, price.taxes, price.discount, price.total, q.coupon.code,
          price.commissionPct, price.commission, price.payout, config.holdMinutes, q.policyKey, JSON.stringify(snapshot)],
      );
      return rows[0];
    });
    ctx.status = 201;
    return { booking: bookingOut(booking) };
  }, { auth: 'customer' });

  r.post('/api/bookings/:id/pay', async ({ db, params, body, user }) => {
    const v = validate(body, {
      method: oneOf(PAYMENT_METHODS, { required: true }),
      upiId: str({ max: 60, pattern: /^[\w.-]{2,}@[a-zA-Z]{2,}$/, patternMsg: 'must look like name@bank' }),
      cardLast4: str({ pattern: /^\d{4}$/, patternMsg: 'must be the last 4 digits of the card' }),
      bank: str({ max: 60 }),
    });
    if (v.method === 'card' && !v.cardLast4) throw invalid('cardLast4', 'is required for card payments');
    if (v.method === 'netbanking' && !v.bank) throw invalid('bank', 'is required for net banking');

    // Outcomes that must be committed (expiry, failed attempt) are returned, not thrown.
    const result = await db.tx(async (t) => {
      const b = await ownBooking(t, user, params.id, { lock: true });
      if (b.status === 'confirmed') return { booking: b };
      if (b.status !== 'held') return { error: conflict('not_payable', `This booking is ${b.status} and can no longer be paid`) };
      if (new Date(b.hold_expires_at) <= new Date()) {
        await t.query("UPDATE bookings SET status = 'expired', updated_at = now() WHERE id = $1", [b.id]);
        await release(t, b);
        return { error: new HttpError(410, 'hold_expired', 'Your booking window expired and the room was released. Please search again.') };
      }
      const details = { upiId: v.upiId, cardLast4: v.cardLast4, bank: v.bank };
      const charge = await gateway.charge({ bookingId: b.id, amount: b.total_amount, method: v.method, details });
      await t.query(
        `INSERT INTO payments (id, booking_id, kind, provider, method, amount, status, provider_ref, details)
         VALUES ($1, $2, 'charge', $3, $4, $5, $6, $7, $8::jsonb)`,
        [newId('pay'), b.id, gateway.name, v.method, b.total_amount, charge.ok ? 'succeeded' : 'failed', charge.ref || null, JSON.stringify({ ...details, failure: charge.reason })],
      );
      if (!charge.ok) return { error: new HttpError(402, 'payment_failed', `${charge.reason}. No money was deducted – please try again or use another method.`) };
      const { rows } = await t.query(
        "UPDATE bookings SET status = 'confirmed', confirmed_at = now(), hold_expires_at = NULL, updated_at = now() WHERE id = $1 RETURNING *",
        [b.id],
      );
      return { booking: rows[0] };
    });
    if (result.error) throw result.error;
    return { booking: bookingOut(result.booking) };
  }, { auth: 'customer' });

  r.get('/api/bookings', async ({ db, user }) => {
    await expireHolds(db);
    const { rows } = await db.query(
      `SELECT b.*, EXISTS (SELECT 1 FROM reviews r WHERE r.booking_id = b.id) AS reviewed
         FROM bookings b WHERE b.user_id = $1 AND b.status <> 'expired' ORDER BY b.created_at DESC LIMIT 100`,
      [user.id],
    );
    return { bookings: rows.map((b) => bookingOut(b)) };
  }, { auth: 'customer' });

  r.get('/api/bookings/:id', async ({ db, params, user }) => ({ booking: bookingOut(await ownBooking(db, user, params.id)) }), { auth: 'customer' });

  r.get('/api/bookings/:id/cancellation', async ({ db, params, user }) => {
    const b = await ownBooking(db, user, params.id);
    return { bookingId: b.id, total: b.total_amount, ...refundQuote(b) };
  }, { auth: 'customer' });

  r.post('/api/bookings/:id/cancel', async ({ db, params, body, user }) => {
    const v = validate(body, { reason: str({ max: 300 }) });
    const updated = await db.tx(async (t) => {
      const b = await ownBooking(t, user, params.id, { lock: true });
      const q = refundQuote(b);
      if (!q.allowed) throw conflict('not_cancellable', q.reason);
      return cancelBooking(t, b, { refund: q.refund, by: 'guest', reason: v.reason });
    });
    return { booking: bookingOut(updated) };
  }, { auth: 'customer' });

  r.post('/api/bookings/:id/review', async (ctx) => {
    const { db, params, body, user } = ctx;
    const v = validate(body, { rating: int({ min: 1, max: 5, required: true }), comment: text({ max: 1000, default: '' }) });
    await db.tx(async (t) => {
      const b = await ownBooking(t, user, params.id, { lock: true });
      if (b.status !== 'confirmed' || b.check_out > todayIST()) throw conflict('not_reviewable', 'You can rate your stay after check-out');
      if (b.reviewed) throw conflict('already_reviewed', 'You have already reviewed this stay');
      await t.query(
        `INSERT INTO reviews (id, property_id, booking_id, user_id, author_name, rating, comment, stayed_on)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [newId('rv'), b.property_id, b.id, user.id, b.guest.firstName, v.rating, v.comment, b.check_in],
      );
      await t.query(
        'UPDATE properties SET rating_avg = (rating_avg * rating_count + $2) / (rating_count + 1), rating_count = rating_count + 1 WHERE id = $1',
        [b.property_id, v.rating],
      );
    });
    ctx.status = 201;
    return { ok: true };
  }, { auth: 'customer' });
}
