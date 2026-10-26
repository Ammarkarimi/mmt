/* Stay pricing: nightly rates, meal-plan deltas, extra adults, GST, coupons and partner payout. */
import { dayOfWeek } from '../lib/dates.js';

// GST on hotel accommodation, decided per room per night (rates effective 22 Sep 2025):
// up to ₹7,500 → 5%, above ₹7,500 → 18%.
export const GST_SLABS = [
  { upTo: 7500, rate: 5 },
  { upTo: Infinity, rate: 18 },
];
export const gstRate = (perRoomNight) => GST_SLABS.find((s) => perRoomNight <= s.upTo).rate;

/** Guests are spread as evenly as possible over the rooms booked. */
export function perRoom(rooms, adults, children) {
  return {
    adults: Math.ceil(adults / rooms),
    children: Math.ceil(children / rooms),
    guests: Math.ceil((adults + children) / rooms),
  };
}

export function fitsRoomType(rt, rooms, adults, children) {
  const p = perRoom(rooms, adults, children);
  return adults >= rooms && p.adults <= rt.max_adults && p.children <= rt.max_children && p.guests <= rt.max_occupancy;
}

/** Adults above the room's base occupancy, summed over all rooms. */
export function extraAdults(rt, rooms, adults) {
  const q = Math.floor(adults / rooms);
  const rem = adults % rooms;
  const base = rt.base_occupancy;
  return rem * Math.max(0, q + 1 - base) + (rooms - rem) * Math.max(0, q - base);
}

const isWeekendNight = (date) => {
  const d = dayOfWeek(date);
  return d === 5 || d === 6; // Friday and Saturday nights
};

/** Room-only rate for one night: calendar override, then weekend price, then base price. */
export function nightlyRate(rt, night) {
  if (night.price != null) return night.price;
  if (rt.weekend_price && isWeekendNight(night.date)) return rt.weekend_price;
  return rt.base_price;
}

/**
 * Price a stay. `nights` is [{ date, price }] where price is the calendar override (or null).
 * Returns integer rupees throughout.
 */
export function priceStay({ rt, plan, nights, rooms, adults }) {
  const extras = extraAdults(rt, rooms, adults);
  const lines = nights.map((n) => {
    const roomRate = Math.max(1, nightlyRate(rt, n) + plan.price_delta);
    const extraCharge = extras * rt.extra_adult_price;
    const amount = roomRate * rooms + extraCharge;
    const taxRate = gstRate(Math.round(amount / rooms));
    return { date: n.date, roomRate, extraAdults: extras, extraCharge, amount, taxRate, tax: Math.round((amount * taxRate) / 100) };
  });
  const roomCharges = lines.reduce((s, l) => s + l.amount, 0);
  const taxes = lines.reduce((s, l) => s + l.tax, 0);
  return {
    currency: 'INR',
    nights: lines,
    nightCount: lines.length,
    rooms,
    roomCharges,
    extraAdultCharges: lines.reduce((s, l) => s + l.extraCharge, 0),
    taxes,
    perNight: Math.round(roomCharges / lines.length / rooms), // average, per room
    perNightTax: Math.round(taxes / lines.length / rooms),
    gross: roomCharges + taxes,
  };
}

/** Final totals once a coupon discount is known, plus what the property earns. */
export function finalise(price, discount, commissionPct) {
  const commission = Math.round((price.roomCharges * commissionPct) / 100);
  return {
    ...price,
    discount,
    total: Math.max(0, price.gross - discount),
    commissionPct,
    commission,
    // Coupons are funded by TripSaathi, so the property is paid on the undiscounted amount.
    payout: price.roomCharges + price.taxes - commission,
  };
}
