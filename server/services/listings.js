/* Property / room serialisation, onboarding checklist and stay evaluation shared by the routes. */
import { badRequest, notFound } from '../http.js';
import { addDays, diffDays, todayIST } from '../lib/dates.js';
import { MEAL_PLANS, PATTERNS } from './catalog.js';
import { applyCoupon, couponOptions } from './coupons.js';
import { loadCalendar, minAvailable } from './inventory.js';
import { CANCELLATION_POLICIES, describePolicy, policyFor } from './policies.js';
import { finalise, fitsRoomType, priceStay } from './pricing.js';

export const MAX_NIGHTS = 30;
export const BOOKING_WINDOW_DAYS = 365;

const mask = (s) => (s ? `${'•'.repeat(Math.max(0, s.length - 4))}${s.slice(-4)}` : '');

/* ---------------------------------------------------------------- serialisers */
export function publicProperty(p) {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    type: p.property_type,
    stars: p.star_rating,
    description: p.description,
    address: p.address,
    locality: p.locality,
    city: p.city,
    state: p.state,
    country: p.country,
    pincode: p.pincode,
    landmark: p.landmark,
    location: p.latitude != null && p.longitude != null ? { lat: p.latitude, lon: p.longitude } : null,
    scene: p.scene,
    checkInTime: p.check_in_time,
    checkOutTime: p.check_out_time,
    amenities: p.amenities,
    photos: p.photos,
    policies: { ...p.policies, cancellation: describePolicy((p.policies && p.policies.cancellation) || 'flexible') },
    rating: p.rating_count ? Math.round(p.rating_avg * 10) / 10 : null,
    ratingCount: p.rating_count,
  };
}

/** Everything a partner (or admin) sees about a listing. Bank details stay masked. */
export function partnerProperty(p) {
  const legal = p.legal || {};
  return {
    ...publicProperty(p),
    status: p.status,
    policies: p.policies,
    contact: p.contact,
    legal: { ...legal, accountNumber: undefined, accountNumberMasked: mask(legal.accountNumber) },
    commissionPct: p.commission_pct,
    reviewNote: p.review_note,
    submittedAt: p.submitted_at,
    approvedAt: p.approved_at,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

export function roomOut(rt, plans = []) {
  return {
    id: rt.id,
    name: rt.name,
    description: rt.description,
    bedType: rt.bed_type,
    view: rt.view,
    sizeSqft: rt.size_sqft,
    baseOccupancy: rt.base_occupancy,
    maxAdults: rt.max_adults,
    maxChildren: rt.max_children,
    maxOccupancy: rt.max_occupancy,
    extraAdultPrice: rt.extra_adult_price,
    totalRooms: rt.total_rooms,
    basePrice: rt.base_price,
    weekendPrice: rt.weekend_price,
    amenities: rt.amenities,
    photos: rt.photos,
    active: rt.active,
    ratePlans: plans.map(planOut),
  };
}

export const planOut = (rp) => ({
  id: rp.id,
  name: rp.name,
  mealPlan: rp.meal_plan,
  mealLabel: MEAL_PLANS[rp.meal_plan].label,
  priceDelta: rp.price_delta,
  refundable: rp.refundable,
  active: rp.active,
});

/* ---------------------------------------------------------------- onboarding checklist */
export function checklist(p, rooms, plans) {
  const legal = p.legal || {};
  const contact = p.contact || {};
  const india = (p.country || 'India') === 'India';
  const activeRooms = rooms.filter((r) => r.active);
  const roomsWithPlans = activeRooms.filter((r) => plans.some((rp) => rp.room_type_id === r.id && rp.active));
  const items = [
    { key: 'basics', label: 'Property name, type and description (at least 50 characters)', done: p.name.length >= 3 && !!p.property_type && p.description.length >= 50 },
    { key: 'location', label: 'Full address, locality, city' + (india ? ' and 6-digit PIN code' : ''), done: p.address.length >= 5 && !!p.locality && !!p.city && (!india || PATTERNS.pincode.test(p.pincode)) },
    { key: 'contact', label: 'Property contact phone and email', done: /^[6-9]\d{9}$/.test(contact.phone || '') && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact.email || '') },
    { key: 'amenities', label: 'At least 3 amenities', done: (p.amenities || []).length >= 3 },
    { key: 'policies', label: 'Check-in/check-out times and cancellation policy', done: PATTERNS.time.test(p.check_in_time) && PATTERNS.time.test(p.check_out_time) && !!CANCELLATION_POLICIES[(p.policies || {}).cancellation] },
    { key: 'rooms', label: 'At least one room type with a rate plan', done: roomsWithPlans.length > 0 },
    { key: 'legal', label: 'Legal entity name and PAN' + (legal.gstin ? ' (and a valid GSTIN)' : ''), done: (legal.legalName || '').length >= 3 && PATTERNS.pan.test(legal.pan || '') && (!legal.gstin || PATTERNS.gstin.test(legal.gstin)) },
    { key: 'bank', label: 'Bank account for payouts (account name, number, IFSC)', done: (legal.accountName || '').length >= 3 && PATTERNS.account.test(legal.accountNumber || '') && PATTERNS.ifsc.test(legal.ifsc || '') },
    { key: 'agreement', label: 'Accept the TripSaathi partner agreement', done: legal.agreementAccepted === true },
  ];
  return { items, complete: items.every((i) => i.done), done: items.filter((i) => i.done).length, total: items.length };
}

/* ---------------------------------------------------------------- stay search & pricing */
/** Validate and normalise stay dates & occupancy. */
export function checkStay({ checkin, checkout, rooms, adults, children }) {
  const today = todayIST();
  if (checkin < today) throw badRequest('Check-in date cannot be in the past', { checkin: 'is in the past' });
  if (checkin > addDays(today, BOOKING_WINDOW_DAYS)) throw badRequest(`Bookings open ${BOOKING_WINDOW_DAYS} days in advance`, { checkin: 'is too far ahead' });
  const nights = diffDays(checkout, checkin);
  if (nights < 1) throw badRequest('Check-out must be after check-in', { checkout: 'must be after check-in' });
  if (nights > MAX_NIGHTS) throw badRequest(`Stays can be at most ${MAX_NIGHTS} nights`, { checkout: 'is too far after check-in' });
  if (adults < rooms) throw badRequest('Each room needs at least one adult', { adults: 'must be at least the number of rooms' });
  return { checkin, checkout, nights, rooms, adults, children };
}

/**
 * Price every bookable room type × rate plan of the given properties for a stay.
 * Returns Map<propertyId, [{ room, plans: [{ plan, price, policy }], available, fits }]>.
 */
export async function evaluateStays(c, properties, stay) {
  const ids = JSON.stringify(properties.map((p) => p.id));
  const { rows: rooms } = await c.query(`SELECT * FROM room_types WHERE active AND property_id IN (SELECT jsonb_array_elements_text($1::jsonb)) ORDER BY sort, base_price`, [ids]);
  const { rows: plans } = await c.query(
    `SELECT rp.* FROM rate_plans rp JOIN room_types rt ON rt.id = rp.room_type_id
      WHERE rp.active AND rt.active AND rt.property_id IN (SELECT jsonb_array_elements_text($1::jsonb))
      ORDER BY rp.sort, rp.price_delta`,
    [ids],
  );
  const calendar = await loadCalendar(c, rooms.map((r) => r.id), stay.checkin, stay.checkout);
  const byProperty = new Map(properties.map((p) => [p.id, []]));
  const propById = new Map(properties.map((p) => [p.id, p]));
  for (const rt of rooms) {
    const nights = calendar.get(rt.id);
    const available = minAvailable(nights);
    const fits = fitsRoomType(rt, stay.rooms, stay.adults, stay.children);
    const p = propById.get(rt.property_id);
    const pricedPlans = plans
      .filter((rp) => rp.room_type_id === rt.id)
      .map((rp) => {
        const price = priceStay({ rt, plan: rp, nights, rooms: stay.rooms, adults: stay.adults });
        return { plan: rp, price, policy: describePolicy(policyFor(p, rp)) };
      });
    if (!pricedPlans.length) continue;
    byProperty.get(rt.property_id).push({ room: rt, plans: pricedPlans, available, fits, bookable: fits && available >= stay.rooms });
  }
  return byProperty;
}

/** Load the live property, room type and plan referenced by a quote/booking request. */
export async function loadSelection(c, { propertyId, roomTypeId, ratePlanId }) {
  // Sequential on purpose: `c` may be a transaction handle, which runs one query at a time.
  const property = (await c.query("SELECT * FROM properties WHERE id = $1 AND status = 'live'", [propertyId])).rows[0];
  const room = property && (await c.query('SELECT * FROM room_types WHERE id = $1 AND property_id = $2 AND active', [roomTypeId, propertyId])).rows[0];
  const plan = room && (await c.query('SELECT * FROM rate_plans WHERE id = $1 AND room_type_id = $2 AND active', [ratePlanId, roomTypeId])).rows[0];
  if (!plan) throw notFound('Room option');
  return { property, room, plan };
}

/** Full, authoritative quote for one selection (used by both /quote and booking creation). */
export async function quoteSelection(c, sel, stay, couponCode) {
  const { property, room, plan } = sel;
  if (!fitsRoomType(room, stay.rooms, stay.adults, stay.children)) {
    throw badRequest(`${room.name} fits at most ${room.max_adults} adults and ${room.max_children} children per room – add more rooms or pick a larger room`, { rooms: 'not enough for your guests' });
  }
  const nights = (await loadCalendar(c, [room.id], stay.checkin, stay.checkout)).get(room.id);
  const price = priceStay({ rt: room, plan, nights, rooms: stay.rooms, adults: stay.adults });
  const couponCtx = { gross: price.gross, category: property.category };
  const coupon = applyCoupon(couponCode, couponCtx);
  const policyKey = policyFor(property, plan);
  return {
    price: finalise(price, coupon.discount, property.commission_pct),
    available: minAvailable(nights),
    coupon,
    coupons: couponOptions(couponCtx),
    policyKey,
    policy: describePolicy(policyKey),
  };
}
