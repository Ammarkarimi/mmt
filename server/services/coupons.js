/* Hotel coupon rules. Mirrors the codes advertised on the website, enforced on the server. */

export const HOTEL_COUPONS = [
  { code: 'TSSTAY', desc: '20% off on hotels (max ₹2,000)', pct: 20, max: 2000 },
  { code: 'TSHOME', desc: '₹500 off on homestays & villas', flat: 500, category: 'homestay' },
  { code: 'TSUPI', desc: '₹150 instant discount for all bookings', flat: 150, min: 2000 },
  { code: 'TSCARD', desc: '10% off with select credit cards (max ₹2,500)', pct: 10, max: 2500 },
];

function check(c, { gross, category }) {
  if (c.category && c.category !== category) return { ok: false, reason: 'Valid on homestays & villas only' };
  if (c.min && gross < c.min) return { ok: false, reason: `Needs a minimum booking of ₹${c.min.toLocaleString('en-IN')}` };
  const discount = Math.round(c.pct ? Math.min(c.max || Infinity, (gross * c.pct) / 100) : c.flat);
  return { ok: true, discount: Math.min(discount, gross) };
}

/** All hotel coupons with whether each applies to this booking. */
export const couponOptions = (ctx) =>
  HOTEL_COUPONS.map((c) => {
    const r = check(c, ctx);
    return { code: c.code, desc: c.desc, eligible: r.ok, discount: r.ok ? r.discount : 0, reason: r.ok ? null : r.reason };
  });

/** Evaluate a code typed by the guest. */
export function applyCoupon(code, ctx) {
  if (!code) return { code: null, discount: 0, error: null };
  const c = HOTEL_COUPONS.find((x) => x.code === String(code).trim().toUpperCase());
  if (!c) return { code: null, discount: 0, error: 'This coupon code is not valid for hotel bookings' };
  const r = check(c, ctx);
  if (!r.ok) return { code: null, discount: 0, error: `${c.code}: ${r.reason}` };
  return { code: c.code, discount: r.discount, error: null };
}
