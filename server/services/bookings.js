/* Booking serialisation and cancellation, shared by guest, partner and admin routes. */
import { newId } from '../lib/security.js';
import { todayIST } from '../lib/dates.js';
import { release } from './inventory.js';
import { gateway } from './payments.js';
import { describePolicy } from './policies.js';

export function stageOf(b, today = todayIST()) {
  if (b.status !== 'confirmed') return b.status;
  if (b.check_out <= today) return 'completed';
  if (b.check_in <= today) return 'in_house';
  return 'upcoming';
}

/** view: 'guest' hides partner economics; 'partner' and 'admin' include them. */
export function bookingOut(b, view = 'guest') {
  const s = b.snapshot || {};
  const out = {
    id: b.id,
    status: b.status,
    stage: stageOf(b),
    property: {
      id: b.property_id, name: s.propertyName, city: s.city, locality: s.locality, address: s.address, scene: s.scene,
      stars: s.stars, category: s.category, checkInTime: s.checkInTime, checkOutTime: s.checkOutTime, phone: s.propertyPhone,
    },
    room: { id: b.room_type_id, name: s.roomName, bedType: s.bedType },
    plan: { id: b.rate_plan_id, name: s.planName, mealPlan: s.mealPlan, inclusions: s.inclusions || [] },
    checkIn: b.check_in,
    checkOut: b.check_out,
    nights: b.nights,
    rooms: b.rooms,
    adults: b.adults,
    children: b.children,
    guest: b.guest,
    specialRequests: b.special_requests,
    price: {
      roomCharges: b.room_charges, taxes: b.taxes, discount: b.discount, total: b.total_amount,
      perNight: b.pricing.perNight, nights: b.pricing.nights,
    },
    couponCode: b.coupon_code,
    cancellationPolicy: describePolicy(b.cancellation_policy),
    holdExpiresAt: b.hold_expires_at,
    confirmedAt: b.confirmed_at,
    cancelledAt: b.cancelled_at,
    cancelledBy: b.cancelled_by,
    cancelReason: b.cancel_reason,
    refundAmount: b.refund_amount,
    reviewed: Boolean(b.reviewed),
    createdAt: b.created_at,
  };
  if (view !== 'guest') {
    out.commissionPct = b.commission_pct;
    out.commission = b.commission_amount;
    out.payout = b.payout_amount;
  }
  return out;
}

/** Cancel a locked booking row inside transaction `t`, release its rooms and refund. */
export async function cancelBooking(t, b, { refund, by, reason }) {
  const paid = b.status === 'confirmed';
  const amount = paid ? refund : 0;
  if (amount > 0) {
    const r = await gateway.refund({ bookingId: b.id, amount });
    await t.query(
      `INSERT INTO payments (id, booking_id, kind, provider, method, amount, status, provider_ref)
       SELECT $1, $2, 'refund', $3, COALESCE((SELECT method FROM payments WHERE booking_id = $2 AND kind = 'charge' AND status = 'succeeded' LIMIT 1), 'original'), $4, $5, $6`,
      [newId('pay'), b.id, gateway.name, amount, r.ok ? 'succeeded' : 'failed', r.ref || null],
    );
  }
  const { rows } = await t.query(
    `UPDATE bookings SET status = 'cancelled', refund_amount = $2, cancelled_at = now(), cancelled_by = $3,
            cancel_reason = $4, hold_expires_at = NULL, updated_at = now()
      WHERE id = $1 RETURNING *`,
    [b.id, amount, by, reason || null],
  );
  await release(t, b);
  return rows[0];
}
