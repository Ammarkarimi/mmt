/*
 * Partner extranet – how a hotel comes onto TripSaathi:
 *   sign up → create a property (draft) → fill details, rooms & rate plans, legal & bank →
 *   submit for review → TripSaathi admin approves → listing goes live → manage the inventory
 *   calendar and see bookings & payouts.
 */
import { HttpError, badRequest, conflict, notFound } from '../http.js';
import { addDays, diffDays, todayIST } from '../lib/dates.js';
import { newId } from '../lib/security.js';
import { bool, date, email, int, invalid, list, num, obj, oneOf, phone, str, text, url, validate } from '../lib/validate.js';
import { bookingOut } from '../services/bookings.js';
import { ALL_PROPERTY_TYPES, AMENITIES, MEAL_PLANS, PATTERNS, PROPERTY_TYPES, ROOM_AMENITIES, SCENES } from '../services/catalog.js';
import { loadCalendar } from '../services/inventory.js';
import { checklist, partnerProperty, roomOut } from '../services/listings.js';
import { POLICY_KEYS } from '../services/policies.js';
import { nightlyRate } from '../services/pricing.js';

/* ---------------------------------------------------------------- validation rules */
const time = () => str({ pattern: PATTERNS.time, patternMsg: 'must be a 24-hour time like 14:00' });
const propertyRules = {
  name: str({ min: 3, max: 120 }),
  category: oneOf(['hotel', 'homestay']),
  propertyType: oneOf(ALL_PROPERTY_TYPES),
  starRating: int({ min: 0, max: 5 }),
  description: text({ max: 4000 }),
  address: str({ max: 300 }),
  locality: str({ max: 80 }),
  city: str({ max: 80 }),
  state: str({ max: 80 }),
  country: str({ max: 80 }),
  pincode: str({ max: 12 }),
  landmark: str({ max: 160 }),
  latitude: num({ min: -90, max: 90, nullable: true }),
  longitude: num({ min: -180, max: 180, nullable: true }),
  scene: oneOf(SCENES),
  checkInTime: time(),
  checkOutTime: time(),
  amenities: list(oneOf(AMENITIES), { max: AMENITIES.length, unique: true }),
  photos: list(url(), { max: 20 }),
  policies: obj({
    cancellation: oneOf(POLICY_KEYS),
    coupleFriendly: bool(),
    payAtHotel: bool(),
    petsAllowed: bool(),
    smokingAllowed: bool(),
    localIdsAllowed: bool(),
    extraRules: list(str({ min: 1, max: 200 }), { max: 10 }),
  }),
  contact: obj({ managerName: str({ max: 80 }), phone: phone(), email: email() }),
  legal: obj({
    legalName: str({ max: 160 }),
    pan: str({ max: 10, upper: true, pattern: PATTERNS.pan, patternMsg: 'must be a valid PAN like ABCDE1234F' }),
    gstin: str({ max: 15, upper: true, pattern: PATTERNS.gstin, patternMsg: 'must be a valid 15-character GSTIN' }),
    accountName: str({ max: 160 }),
    accountNumber: str({ max: 18, pattern: PATTERNS.account, patternMsg: 'must be 9–18 digits' }),
    ifsc: str({ max: 11, upper: true, pattern: PATTERNS.ifsc, patternMsg: 'must be a valid IFSC like SBIN0001234' }),
    agreementAccepted: bool(),
  }),
};

const planRules = obj({
  id: str({ max: 64 }),
  name: str({ min: 2, max: 60, required: true }),
  mealPlan: oneOf(Object.keys(MEAL_PLANS), { default: 'EP' }),
  priceDelta: int({ min: -100000, max: 100000, default: 0 }),
  refundable: bool({ default: true }),
}, { partial: false });

const roomRules = {
  name: str({ min: 2, max: 80 }),
  description: text({ max: 1000 }),
  bedType: str({ max: 60 }),
  view: str({ max: 60 }),
  sizeSqft: int({ min: 50, max: 20000, nullable: true }),
  baseOccupancy: int({ min: 1, max: 10 }),
  maxAdults: int({ min: 1, max: 10 }),
  maxChildren: int({ min: 0, max: 10 }),
  maxOccupancy: int({ min: 1, max: 16 }),
  extraAdultPrice: int({ min: 0, max: 100000 }),
  totalRooms: int({ min: 1, max: 1000 }),
  basePrice: int({ min: 300, max: 1000000 }),
  weekendPrice: int({ min: 300, max: 1000000, nullable: true }),
  amenities: list(oneOf(ROOM_AMENITIES), { max: ROOM_AMENITIES.length, unique: true }),
  photos: list(url(), { max: 20 }),
  ratePlans: list(planRules, { max: 6 }),
};

const PROPERTY_COLUMNS = {
  name: 'name', category: 'category', propertyType: 'property_type', starRating: 'star_rating', description: 'description',
  address: 'address', locality: 'locality', city: 'city', state: 'state', country: 'country', pincode: 'pincode', landmark: 'landmark',
  latitude: 'latitude', longitude: 'longitude', scene: 'scene', checkInTime: 'check_in_time', checkOutTime: 'check_out_time',
};
const ROOM_COLUMNS = {
  name: 'name', description: 'description', bedType: 'bed_type', view: 'view', sizeSqft: 'size_sqft', baseOccupancy: 'base_occupancy',
  maxAdults: 'max_adults', maxChildren: 'max_children', maxOccupancy: 'max_occupancy', extraAdultPrice: 'extra_adult_price',
  totalRooms: 'total_rooms', basePrice: 'base_price', weekendPrice: 'weekend_price',
};

/** Build "col = $n" assignments from whitelisted fields. JSON objects are merged, lists replaced. */
function assignments(v, columns, { replace = [], merge = [] } = {}, offset = 1) {
  const sets = [];
  const params = [];
  const add = (sql, value) => {
    params.push(value);
    sets.push(sql.replace('?', `$${offset + params.length}`));
  };
  for (const [key, col] of Object.entries(columns)) if (key in v) add(`${col} = ?`, v[key]);
  for (const key of replace) if (key in v) add(`${key} = ?::jsonb`, JSON.stringify(v[key]));
  for (const key of merge) if (key in v) add(`${key} = ${key} || ?::jsonb`, JSON.stringify(v[key]));
  return { sets, params };
}

/* ---------------------------------------------------------------- loaders */
async function ownProperty(c, user, id, { lock = false } = {}) {
  const { rows } = await c.query(`SELECT * FROM properties WHERE id = $1 AND owner_id = $2${lock ? ' FOR UPDATE' : ''}`, [id, user.id]);
  if (!rows[0]) throw notFound('Property');
  return rows[0];
}

async function ownRoom(c, user, roomId, { lock = false } = {}) {
  const { rows } = await c.query(
    `SELECT rt.* FROM room_types rt JOIN properties p ON p.id = rt.property_id
      WHERE rt.id = $1 AND p.owner_id = $2${lock ? ' FOR UPDATE OF rt' : ''}`,
    [roomId, user.id],
  );
  if (!rows[0]) throw notFound('Room type');
  return rows[0];
}

async function roomsAndPlans(c, propertyId) {
  const { rows: rooms } = await c.query('SELECT * FROM room_types WHERE property_id = $1 ORDER BY active DESC, sort, created_at', [propertyId]);
  const { rows: plans } = await c.query(
    `SELECT rp.* FROM rate_plans rp JOIN room_types rt ON rt.id = rp.room_type_id
      WHERE rt.property_id = $1 ORDER BY rp.sort, rp.created_at`,
    [propertyId],
  );
  return { rooms, plans };
}

/** Property + rooms + onboarding checklist + history, as shown in the extranet and admin console. */
export async function propertyBundle(c, p) {
  const { rooms, plans } = await roomsAndPlans(c, p.id);
  const { rows: events } = await c.query(
    `SELECT e.action, e.note, e.created_at, u.name AS actor, u.role AS actor_role
       FROM property_events e LEFT JOIN users u ON u.id = e.actor_id
      WHERE e.property_id = $1 ORDER BY e.created_at`,
    [p.id],
  );
  return {
    property: partnerProperty(p),
    rooms: rooms.map((rt) => roomOut(rt, plans.filter((rp) => rp.room_type_id === rt.id && rp.active))),
    checklist: checklist(p, rooms, plans),
    events: events.map((e) => ({ action: e.action, note: e.note, at: e.created_at, by: e.actor, byRole: e.actor_role })),
  };
}

export const logEvent = (c, propertyId, actorId, action, note = null) =>
  c.query('INSERT INTO property_events (id, property_id, actor_id, action, note) VALUES ($1, $2, $3, $4, $5)', [newId('evt'), propertyId, actorId, action, note]);

/** Category and property type must agree; switching category picks a matching default type. */
function reconcileType(v, current = {}) {
  const category = v.category || current.category || 'hotel';
  let type = v.propertyType || current.property_type;
  if (!type || !PROPERTY_TYPES[category].includes(type)) {
    if (v.propertyType) throw invalid('propertyType', `must be one of: ${PROPERTY_TYPES[category].join(', ')}`);
    type = PROPERTY_TYPES[category][0];
  }
  if (type !== current.property_type) v.propertyType = type;
}

/** Cross-field checks on the merged room definition. */
function checkRoomShape(room, plans) {
  if (room.maxAdults > room.maxOccupancy) throw invalid('maxAdults', 'cannot exceed the maximum occupancy');
  if (room.baseOccupancy > room.maxOccupancy) throw invalid('baseOccupancy', 'cannot exceed the maximum occupancy');
  const minRate = Math.min(room.basePrice, room.weekendPrice || Infinity);
  for (const p of plans) {
    if (minRate + p.priceDelta < 100) throw invalid('ratePlans', `"${p.name}" would make the room cost less than ₹100 a night`);
  }
}

const DEFAULT_PLANS = [{ name: 'Room Only', mealPlan: 'EP', priceDelta: 0, refundable: true }];

async function syncPlans(t, roomId, plans) {
  if (!plans.length) throw invalid('ratePlans', 'must include at least one rate plan');
  const { rows: existing } = await t.query('SELECT id, active FROM rate_plans WHERE room_type_id = $1', [roomId]);
  const keep = new Set();
  for (const [i, p] of plans.entries()) {
    if (p.id) {
      if (!existing.some((e) => e.id === p.id)) throw invalid('ratePlans', `item ${i + 1} refers to an unknown rate plan`);
      await t.query('UPDATE rate_plans SET name = $2, meal_plan = $3, price_delta = $4, refundable = $5, active = true, sort = $6 WHERE id = $1', [p.id, p.name, p.mealPlan, p.priceDelta, p.refundable, i]);
      keep.add(p.id);
    } else {
      const id = newId('rp');
      await t.query('INSERT INTO rate_plans (id, room_type_id, name, meal_plan, price_delta, refundable, sort) VALUES ($1, $2, $3, $4, $5, $6, $7)', [id, roomId, p.name, p.mealPlan, p.priceDelta, p.refundable, i]);
      keep.add(id);
    }
  }
  // Plans are deactivated rather than deleted so existing bookings keep their reference.
  for (const e of existing) if (!keep.has(e.id) && e.active) await t.query('UPDATE rate_plans SET active = false WHERE id = $1', [e.id]);
}

const roomFromRow = (rt) => ({ basePrice: rt.base_price, weekendPrice: rt.weekend_price, maxAdults: rt.max_adults, maxOccupancy: rt.max_occupancy, baseOccupancy: rt.base_occupancy });

/* ---------------------------------------------------------------- routes */
export default function partnerRoutes(r) {
  const auth = { auth: 'partner' };

  r.get('/api/partner/dashboard', async ({ db, user }) => {
    const today = todayIST();
    const { rows: properties } = await db.query(
      `SELECT p.*,
              (SELECT count(*) FROM room_types rt WHERE rt.property_id = p.id AND rt.active) AS room_types,
              (SELECT COALESCE(sum(total_rooms), 0) FROM room_types rt WHERE rt.property_id = p.id AND rt.active) AS rooms,
              (SELECT count(*) FROM bookings b WHERE b.property_id = p.id AND b.status = 'confirmed' AND b.check_out > $2) AS upcoming
         FROM properties p WHERE p.owner_id = $1 ORDER BY p.created_at DESC`,
      [user.id, today],
    );
    const { rows: [totals] } = await db.query(
      `SELECT count(*) FILTER (WHERE b.status = 'confirmed') AS confirmed,
              count(*) FILTER (WHERE b.status = 'confirmed' AND b.check_out > $2) AS upcoming,
              count(*) FILTER (WHERE b.status = 'cancelled') AS cancelled,
              COALESCE(sum(b.room_charges) FILTER (WHERE b.status = 'confirmed'), 0) AS gross,
              COALESCE(sum(b.commission_amount) FILTER (WHERE b.status = 'confirmed'), 0) AS commission,
              COALESCE(sum(b.payout_amount) FILTER (WHERE b.status = 'confirmed'), 0) AS payout,
              COALESCE(sum(b.rooms * b.nights) FILTER (WHERE b.status = 'confirmed'), 0) AS room_nights
         FROM bookings b JOIN properties p ON p.id = b.property_id WHERE p.owner_id = $1`,
      [user.id, today],
    );
    const { rows: [occ] } = await db.query(
      `SELECT COALESCE(sum(i.sold), 0) AS sold
         FROM inventory i JOIN room_types rt ON rt.id = i.room_type_id JOIN properties p ON p.id = rt.property_id
        WHERE p.owner_id = $1 AND p.status = 'live' AND rt.active AND i.date >= $2::date AND i.date < $2::date + 30`,
      [user.id, today],
    );
    const capacity = properties.filter((p) => p.status === 'live').reduce((s, p) => s + Number(p.rooms) * 30, 0);
    const { rows: arrivals } = await db.query(
      `SELECT b.* FROM bookings b JOIN properties p ON p.id = b.property_id
        WHERE p.owner_id = $1 AND b.status = 'confirmed' AND b.check_in >= $2 ORDER BY b.check_in, b.created_at LIMIT 8`,
      [user.id, today],
    );
    return {
      totals: { ...totals, occupancyNext30: capacity ? Math.round((occ.sold / capacity) * 1000) / 10 : 0 },
      properties: properties.map((p) => ({ ...partnerProperty(p), roomTypes: p.room_types, rooms: p.rooms, upcomingBookings: p.upcoming })),
      arrivals: arrivals.map((b) => bookingOut(b, 'partner')),
    };
  }, auth);

  /* ------------------------------------------------------------ properties */
  r.get('/api/partner/properties', async ({ db, user }) => {
    const { rows } = await db.query('SELECT * FROM properties WHERE owner_id = $1 ORDER BY created_at DESC', [user.id]);
    return { properties: rows.map(partnerProperty) };
  }, auth);

  r.post('/api/partner/properties', async (ctx) => {
    const { db, user, body, config } = ctx;
    const v = validate(body, { ...propertyRules, name: str({ min: 3, max: 120, required: true }) });
    reconcileType(v);
    const bundle = await db.tx(async (t) => {
      const id = newId('prp');
      await t.query(
        "INSERT INTO properties (id, owner_id, name, category, property_type, commission_pct, policies) VALUES ($1, $2, $3, $4, $5, $6, '{\"cancellation\":\"flexible\"}')",
        [id, user.id, v.name, v.category || 'hotel', v.propertyType, config.defaultCommissionPct],
      );
      const { sets, params } = assignments(v, PROPERTY_COLUMNS, { replace: ['amenities', 'photos'], merge: ['policies', 'contact', 'legal'] });
      if (sets.length) await t.query(`UPDATE properties SET ${sets.join(', ')} WHERE id = $1`, [id, ...params]);
      await logEvent(t, id, user.id, 'created');
      return propertyBundle(t, (await t.query('SELECT * FROM properties WHERE id = $1', [id])).rows[0]);
    });
    ctx.status = 201;
    return bundle;
  }, auth);

  r.get('/api/partner/properties/:id', async ({ db, user, params }) => propertyBundle(db, await ownProperty(db, user, params.id)), auth);

  r.patch('/api/partner/properties/:id', async ({ db, user, params, body }) => {
    const v = validate(body, propertyRules, { partial: true });
    return db.tx(async (t) => {
      const p = await ownProperty(t, user, params.id, { lock: true });
      if (p.status === 'suspended') throw conflict('suspended', 'This property is suspended. Please contact TripSaathi partner support.');
      if (v.category || v.propertyType) reconcileType(v, p);
      const { sets, params: values } = assignments(v, PROPERTY_COLUMNS, { replace: ['amenities', 'photos'], merge: ['policies', 'contact', 'legal'] });
      if (sets.length) await t.query(`UPDATE properties SET ${sets.join(', ')}, updated_at = now() WHERE id = $1`, [p.id, ...values]);
      return propertyBundle(t, (await t.query('SELECT * FROM properties WHERE id = $1', [p.id])).rows[0]);
    });
  }, auth);

  r.delete('/api/partner/properties/:id', async ({ db, user, params }) => {
    await db.tx(async (t) => {
      const p = await ownProperty(t, user, params.id, { lock: true });
      if (!['draft', 'rejected'].includes(p.status)) throw conflict('invalid_status', 'Only draft or rejected properties can be deleted');
      const { rows } = await t.query('SELECT 1 FROM bookings WHERE property_id = $1 LIMIT 1', [p.id]);
      if (rows[0]) throw conflict('has_bookings', 'This property has bookings and cannot be deleted');
      await t.query('DELETE FROM properties WHERE id = $1', [p.id]);
    });
    return { ok: true };
  }, auth);

  r.post('/api/partner/properties/:id/submit', async ({ db, user, params }) =>
    db.tx(async (t) => {
      const p = await ownProperty(t, user, params.id, { lock: true });
      if (!['draft', 'rejected'].includes(p.status)) throw conflict('invalid_status', `Only draft or rejected properties can be submitted – this one is ${p.status.replace('_', ' ')}`);
      const { rooms, plans } = await roomsAndPlans(t, p.id);
      const cl = checklist(p, rooms, plans);
      if (!cl.complete) throw new HttpError(422, 'incomplete', 'Please complete every onboarding step before submitting', { missing: cl.items.filter((i) => !i.done).map((i) => i.label) });
      await t.query("UPDATE properties SET status = 'pending_review', submitted_at = now(), review_note = NULL, updated_at = now() WHERE id = $1", [p.id]);
      await logEvent(t, p.id, user.id, 'submitted');
      return propertyBundle(t, (await t.query('SELECT * FROM properties WHERE id = $1', [p.id])).rows[0]);
    }), auth);

  /* ------------------------------------------------------------ rooms & rate plans */
  r.post('/api/partner/properties/:id/rooms', async (ctx) => {
    const { db, user, params, body } = ctx;
    const v = validate(body, {
      ...roomRules,
      name: str({ min: 2, max: 80, required: true }),
      totalRooms: int({ min: 1, max: 1000, required: true }),
      basePrice: int({ min: 300, max: 1000000, required: true }),
      baseOccupancy: int({ min: 1, max: 10, default: 2 }),
      maxAdults: int({ min: 1, max: 10, default: 2 }),
      maxChildren: int({ min: 0, max: 10, default: 1 }),
      maxOccupancy: int({ min: 1, max: 16, default: 3 }),
      ratePlans: list(planRules, { max: 6, default: () => DEFAULT_PLANS }),
    });
    checkRoomShape(v, v.ratePlans);
    const bundle = await db.tx(async (t) => {
      const p = await ownProperty(t, user, params.id, { lock: true });
      if (p.status === 'suspended') throw conflict('suspended', 'This property is suspended');
      const id = newId('rt');
      const { rows: [{ n }] } = await t.query('SELECT count(*) AS n FROM room_types WHERE property_id = $1', [p.id]);
      await t.query('INSERT INTO room_types (id, property_id, name, total_rooms, base_price, sort) VALUES ($1, $2, $3, $4, $5, $6)', [id, p.id, v.name, v.totalRooms, v.basePrice, n]);
      const { sets, params: values } = assignments(v, ROOM_COLUMNS, { replace: ['amenities', 'photos'] });
      await t.query(`UPDATE room_types SET ${sets.join(', ')} WHERE id = $1`, [id, ...values]);
      await syncPlans(t, id, v.ratePlans);
      await t.query('UPDATE properties SET updated_at = now() WHERE id = $1', [p.id]);
      return propertyBundle(t, p);
    });
    ctx.status = 201;
    return bundle;
  }, auth);

  r.patch('/api/partner/rooms/:roomId', async ({ db, user, params, body }) => {
    const v = validate(body, roomRules, { partial: true });
    return db.tx(async (t) => {
      const rt = await ownRoom(t, user, params.roomId, { lock: true });
      const merged = { ...roomFromRow(rt), ...v };
      const plans = v.ratePlans || (await t.query('SELECT price_delta AS "priceDelta", name FROM rate_plans WHERE room_type_id = $1 AND active', [rt.id])).rows;
      checkRoomShape(merged, plans);
      if (v.totalRooms !== undefined && v.totalRooms < rt.total_rooms) {
        const { rows } = await t.query(
          'SELECT date FROM inventory WHERE room_type_id = $1 AND total IS NULL AND date >= $2 AND sold > $3 ORDER BY date LIMIT 5',
          [rt.id, todayIST(), v.totalRooms],
        );
        if (rows.length) throw conflict('below_sold', `You already have more than ${v.totalRooms} rooms booked on ${rows.map((x) => x.date).join(', ')}`, { dates: rows.map((x) => x.date) });
      }
      const { sets, params: values } = assignments(v, ROOM_COLUMNS, { replace: ['amenities', 'photos'] });
      if (sets.length) await t.query(`UPDATE room_types SET ${sets.join(', ')}, updated_at = now() WHERE id = $1`, [rt.id, ...values]);
      if (v.ratePlans) await syncPlans(t, rt.id, v.ratePlans);
      await t.query('UPDATE properties SET updated_at = now() WHERE id = $1', [rt.property_id]);
      return propertyBundle(t, (await t.query('SELECT * FROM properties WHERE id = $1', [rt.property_id])).rows[0]);
    });
  }, auth);

  r.delete('/api/partner/rooms/:roomId', async ({ db, user, params }) =>
    db.tx(async (t) => {
      const rt = await ownRoom(t, user, params.roomId, { lock: true });
      const { rows } = await t.query('SELECT 1 FROM bookings WHERE room_type_id = $1 LIMIT 1', [rt.id]);
      // Rooms with booking history are hidden instead of deleted.
      if (rows[0]) await t.query('UPDATE room_types SET active = false, updated_at = now() WHERE id = $1', [rt.id]);
      else await t.query('DELETE FROM room_types WHERE id = $1', [rt.id]);
      return propertyBundle(t, (await t.query('SELECT * FROM properties WHERE id = $1', [rt.property_id])).rows[0]);
    }), auth);

  /* ------------------------------------------------------------ inventory & rates calendar */
  r.get('/api/partner/rooms/:roomId/calendar', async ({ db, user, params, query }) => {
    const rt = await ownRoom(db, user, params.roomId);
    const v = validate(query, { from: date({ default: todayIST }), days: int({ min: 1, max: 92, default: 30 }) });
    const to = addDays(v.from, v.days);
    const nights = (await loadCalendar(db, [rt.id], v.from, to)).get(rt.id);
    return {
      room: roomOut(rt),
      from: v.from,
      to,
      days: nights.map((n) => ({ date: n.date, total: n.total, sold: n.sold, available: n.available, stopSell: n.stopSell, rate: nightlyRate(rt, n), priceOverride: n.price, totalOverride: n.totalOverride })),
    };
  }, auth);

  r.put('/api/partner/rooms/:roomId/calendar', async ({ db, user, params, body }) => {
    const v = validate(body, {
      from: date({ required: true }),
      to: date({ required: true }),
      weekdays: list(int({ min: 0, max: 6 }), { max: 7, unique: true }),
      total: int({ min: 0, max: 1000, nullable: true }),
      price: int({ min: 300, max: 1000000, nullable: true }),
      stopSell: bool(),
    });
    if (v.to < v.from) throw badRequest('"to" must be on or after "from"', { to: 'is before from' });
    if (v.from < todayIST()) throw badRequest('Past dates cannot be changed', { from: 'is in the past' });
    if (diffDays(v.to, v.from) > 365) throw badRequest('You can update at most one year at a time', { to: 'is too far from from' });
    if (!('total' in v) && !('price' in v) && !('stopSell' in v)) throw badRequest('Nothing to update: send total, price or stopSell');
    const weekdays = JSON.stringify(v.weekdays && v.weekdays.length ? v.weekdays : [0, 1, 2, 3, 4, 5, 6]);
    return db.tx(async (t) => {
      const rt = await ownRoom(t, user, params.roomId, { lock: true });
      const range = [rt.id, v.from, v.to, weekdays];
      const inRange = `room_type_id = $1 AND date BETWEEN $2::date AND $3::date AND extract(dow FROM date)::int IN (SELECT jsonb_array_elements_text($4::jsonb)::int)`;
      await t.query(
        `INSERT INTO inventory (room_type_id, date)
         SELECT $1, d::date FROM generate_series($2::date, $3::date, interval '1 day') AS d
          WHERE extract(dow FROM d)::int IN (SELECT jsonb_array_elements_text($4::jsonb)::int)
         ON CONFLICT DO NOTHING`,
        range,
      );
      if ('total' in v) {
        const effective = v.total ?? rt.total_rooms;
        const { rows } = await t.query(`SELECT date FROM inventory WHERE ${inRange} AND sold > $5 ORDER BY date LIMIT 5`, [...range, effective]);
        if (rows.length) throw conflict('below_sold', `More than ${effective} rooms are already booked on ${rows.map((x) => x.date).join(', ')}`, { dates: rows.map((x) => x.date) });
      }
      const res = await t.query(
        `UPDATE inventory SET
            total = CASE WHEN $5::boolean THEN $6::int ELSE total END,
            price = CASE WHEN $7::boolean THEN $8::int ELSE price END,
            stop_sell = CASE WHEN $9::boolean THEN $10::boolean ELSE stop_sell END
          WHERE ${inRange}`,
        [...range, 'total' in v, v.total ?? null, 'price' in v, v.price ?? null, 'stopSell' in v, v.stopSell ?? false],
      );
      return { updated: res.rowCount };
    });
  }, auth);

  /* ------------------------------------------------------------ bookings */
  r.get('/api/partner/bookings', async ({ db, user, query }) => {
    const v = validate(query, {
      propertyId: str({ max: 64 }),
      status: oneOf(['upcoming', 'completed', 'cancelled', 'held', 'confirmed']),
      from: date(),
      to: date(),
    });
    const today = todayIST();
    const where = ['p.owner_id = $1', "b.status <> 'expired'"];
    const params = [user.id];
    const add = (sql, value) => {
      params.push(value);
      where.push(sql.replace('?', `$${params.length}`));
    };
    if (v.propertyId) add('b.property_id = ?', v.propertyId);
    if (v.status === 'upcoming') add("b.status = 'confirmed' AND b.check_out > ?", today);
    else if (v.status === 'completed') add("b.status = 'confirmed' AND b.check_out <= ?", today);
    else if (v.status) add('b.status = ?', v.status);
    if (v.from) add('b.check_in >= ?', v.from);
    if (v.to) add('b.check_in <= ?', v.to);
    const { rows } = await db.query(
      `SELECT b.* FROM bookings b JOIN properties p ON p.id = b.property_id WHERE ${where.join(' AND ')} ORDER BY b.check_in DESC, b.created_at DESC LIMIT 200`,
      params,
    );
    return { bookings: rows.map((b) => bookingOut(b, 'partner')) };
  }, auth);
}
