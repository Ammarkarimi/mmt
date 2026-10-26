/*
 * Payment gateway adapter. The built-in "mock" provider approves every payment except the
 * documented test failures, so the full booking flow works without real money.
 *
 * To go live, add a provider with the same two functions (e.g. Razorpay: create an order in
 * charge(), verify the checkout signature / webhook, call the refunds API in refund()).
 */
import { randomCode } from '../lib/security.js';

export const PAYMENT_METHODS = ['upi', 'card', 'netbanking', 'paylater'];

const mock = {
  name: 'mock',
  async charge({ method, details }) {
    if (method === 'card' && details.cardLast4 === '0002') return { ok: false, reason: 'Your card was declined by the issuing bank' };
    if (method === 'upi' && /^fail@/i.test(details.upiId || '')) return { ok: false, reason: 'The UPI payment request was declined' };
    return { ok: true, ref: `mockpay_${randomCode(14)}` };
  },
  async refund() {
    return { ok: true, ref: `mockrfnd_${randomCode(14)}` };
  },
};

export const gateway = mock;
