/* Cancellation policies and refund calculation. */
import { istMoment } from '../lib/dates.js';

export const CANCELLATION_POLICIES = {
  flexible: { label: 'Free cancellation till 24 hrs before check-in', freeBeforeHours: 24, after: 'first_night', afterLabel: 'first night charged after that' },
  moderate: { label: 'Free cancellation till 5 days before check-in', freeBeforeHours: 120, after: 'half', afterLabel: '50% charged after that' },
  strict: { label: 'Free cancellation till 14 days before check-in', freeBeforeHours: 336, after: 'full', afterLabel: 'non-refundable after that' },
  non_refundable: { label: 'Non-refundable', freeBeforeHours: null, after: 'full', afterLabel: 'no refund on cancellation' },
};
export const POLICY_KEYS = Object.keys(CANCELLATION_POLICIES);

/** The policy that applies to a rate plan: non-refundable plans override the property policy. */
export const policyFor = (property, plan) => (plan.refundable ? (property.policies && property.policies.cancellation) || 'flexible' : 'non_refundable');

export const describePolicy = (key) => {
  const p = CANCELLATION_POLICIES[key] || CANCELLATION_POLICIES.non_refundable;
  return { key, label: p.label, detail: p.freeBeforeHours == null ? p.afterLabel : `${p.label}, ${p.afterLabel}` };
};

/**
 * What a guest gets back if they cancel `booking` now.
 * booking: row with status, total_amount, cancellation_policy, check_in, pricing, snapshot.
 */
export function refundQuote(booking, now = new Date()) {
  if (booking.status === 'held') return { allowed: true, refund: 0, penalty: 0, note: 'Payment was not completed, so nothing is charged.' };
  if (booking.status !== 'confirmed') return { allowed: false, reason: `This booking is already ${booking.status}` };
  const checkInAt = istMoment(booking.check_in, (booking.snapshot && booking.snapshot.checkInTime) || '14:00');
  const hoursLeft = (checkInAt.getTime() - now.getTime()) / 36e5;
  if (hoursLeft <= 0) return { allowed: false, reason: 'Check-in time has passed, so this booking can no longer be cancelled online' };

  const policy = CANCELLATION_POLICIES[booking.cancellation_policy] || CANCELLATION_POLICIES.non_refundable;
  const total = booking.total_amount;
  let penalty;
  if (policy.freeBeforeHours != null && hoursLeft >= policy.freeBeforeHours) penalty = 0;
  else if (policy.after === 'first_night') {
    const first = booking.pricing.nights[0];
    // Charge the first night's share of what was actually paid (after any coupon).
    penalty = Math.round(((first.amount + first.tax) * total) / booking.pricing.gross);
  } else if (policy.after === 'half') penalty = Math.round(total / 2);
  else penalty = total;
  penalty = Math.min(total, penalty);
  const freeUntil = policy.freeBeforeHours == null ? null : new Date(checkInAt.getTime() - policy.freeBeforeHours * 36e5).toISOString();
  return { allowed: true, refund: total - penalty, penalty, policy: describePolicy(booking.cancellation_policy), freeUntil };
}
