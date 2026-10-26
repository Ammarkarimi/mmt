/* TripSaathi admin console: review partner listings, monitor bookings, step in when needed. */
import { HttpError, conflict, notFound } from '../http.js';
import { todayIST } from '../lib/dates.js';
import { int, oneOf, str, text, validate } from '../lib/validate.js';
import { bookingOut, cancelBooking } from '../services/bookings.js';
import { checklist, partnerProperty } from '../services/listings.js';
import { logEvent, propertyBundle } from './partner.js';

const STATUSES = ['draft', 'pending_review', 'live', 'rejected', 'suspended'];

async function loadProperty(c, id, { lock = false } = {}) {
  const { rows } = await c.query(`SELECT * FROM properties WHERE id = $1${lock ? ' FOR UPDATE' : ''}`, [id]);
  if (!rows[0]) throw notFound('Property');
  return rows[0];
}

async function ownerOf(c, ownerId) {
  const { rows } = await c.query('SELECT id, name, email, phone, created_at FROM users WHERE id = $1', [ownerId]);
  return rows[0] ? { id: rows[0].id, name: rows[0].name, email: rows[0].email, phone: rows[0].phone, since: rows[0].created_at } : null;
}

/** Move a property between statuses, failing if it is not in one of `from`. */
async function transition(db, user, id, { from, to, action, note, extra = '', extraParams = [], requireComplete = false }) {
  return db.tx(async (t) => {
    const p = await loadProperty(t, id, { lock: true });
    if (!from.includes(p.status)) throw conflict('invalid_status', `This property is ${p.status.replace('_', ' ')}; it must be ${from.map((s) => s.replace('_', ' ')).join(' or ')}`);
    if (requireComplete) {
      const rooms = (await t.query('SELECT * FROM room_types WHERE property_id = $1', [p.id])).rows;
      const plans = (await t.query('SELECT rp.* FROM rate_plans rp JOIN room_types rt ON rt.id = rp.room_type_id WHERE rt.property_id = $1', [p.id])).rows;
      const cl = checklist(p, rooms, plans);
      if (!cl.complete) throw new HttpError(422, 'incomplete', 'The listing is missing required details', { missing: cl.items.filter((i) => !i.done).map((i) => i.label) });
    }
    await t.query(`UPDATE properties SET status = $2, updated_at = now()${extra} WHERE id = $1`, [p.id, to, ...extraParams]);
    await logEvent(t, p.id, user.id, action, note || null);
    const fresh = await loadProperty(t, p.id);
    return { ...(await propertyBundle(t, fresh)), owner: await ownerOf(t, fresh.owner_id) };
  });
}

export default function adminRoutes(r) {
  const auth = { auth: 'admin' };

  r.get('/api/admin/stats', async ({ db }) => {
    const { rows: byStatus } = await db.query('SELECT status, count(*) AS n FROM properties GROUP BY status');
    const { rows: [users] } = await db.query(
      "SELECT count(*) FILTER (WHERE role = 'partner') AS partners, count(*) FILTER (WHERE role = 'customer') AS customers FROM users",
    );
    const { rows: [b] } = await db.query(
      `SELECT count(*) FILTER (WHERE status = 'confirmed') AS confirmed,
              count(*) FILTER (WHERE status = 'cancelled') AS cancelled,
              count(*) FILTER (WHERE status = 'held') AS held,
              COALESCE(sum(total_amount) FILTER (WHERE status = 'confirmed'), 0) AS gmv,
              COALESCE(sum(commission_amount) FILTER (WHERE status = 'confirmed'), 0) AS commission,
              COALESCE(sum(discount) FILTER (WHERE status = 'confirmed'), 0) AS discounts,
              COALESCE(sum(refund_amount) FILTER (WHERE status = 'cancelled'), 0) AS refunds
         FROM bookings`,
    );
    return { properties: Object.fromEntries(STATUSES.map((s) => [s, Number((byStatus.find((x) => x.status === s) || { n: 0 }).n)])), users, bookings: b };
  }, auth);

  r.get('/api/admin/properties', async ({ db, query }) => {
    const v = validate(query, { status: oneOf(STATUSES), q: str({ max: 80 }) });
    const where = [];
    const params = [];
    if (v.status) {
      params.push(v.status);
      where.push(`p.status = $${params.length}`);
    }
    if (v.q) {
      params.push(`%${v.q.toLowerCase()}%`);
      where.push(`(lower(p.name) LIKE $${params.length} OR lower(p.city) LIKE $${params.length} OR lower(u.email) LIKE $${params.length})`);
    }
    const { rows } = await db.query(
      `SELECT p.*, u.name AS owner_name, u.email AS owner_email,
              (SELECT count(*) FROM room_types rt WHERE rt.property_id = p.id AND rt.active) AS room_types
         FROM properties p JOIN users u ON u.id = p.owner_id
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY (p.status = 'pending_review') DESC, COALESCE(p.submitted_at, p.created_at) DESC
        LIMIT 300`,
      params,
    );
    return { properties: rows.map((p) => ({ ...partnerProperty(p), owner: { name: p.owner_name, email: p.owner_email }, roomTypes: p.room_types })) };
  }, auth);

  r.get('/api/admin/properties/:id', async ({ db, params }) => {
    const p = await loadProperty(db, params.id);
    return { ...(await propertyBundle(db, p)), owner: await ownerOf(db, p.owner_id) };
  }, auth);

  r.post('/api/admin/properties/:id/approve', async ({ db, user, params, body }) => {
    const v = validate(body, { commissionPct: int({ min: 0, max: 50 }), note: str({ max: 300 }) });
    return transition(db, user, params.id, {
      from: ['pending_review'], to: 'live', action: 'approved', note: v.note, requireComplete: true,
      extra: ', approved_at = now(), review_note = NULL, commission_pct = COALESCE($3, commission_pct)', extraParams: [v.commissionPct ?? null],
    });
  }, auth);

  r.post('/api/admin/properties/:id/reject', async ({ db, user, params, body }) => {
    const v = validate(body, { reason: text({ max: 1000, required: true }) });
    if (v.reason.length < 10) throw new HttpError(400, 'validation_error', 'reason should explain what the partner needs to fix (at least 10 characters)', { reason: 'is too short' });
    return transition(db, user, params.id, { from: ['pending_review'], to: 'rejected', action: 'rejected', note: v.reason, extra: ', review_note = $3', extraParams: [v.reason] });
  }, auth);

  r.post('/api/admin/properties/:id/suspend', async ({ db, user, params, body }) => {
    const v = validate(body, { reason: text({ max: 1000, required: true }) });
    return transition(db, user, params.id, { from: ['live'], to: 'suspended', action: 'suspended', note: v.reason, extra: ', review_note = $3', extraParams: [v.reason] });
  }, auth);

  r.post('/api/admin/properties/:id/reinstate', async ({ db, user, params }) =>
    transition(db, user, params.id, { from: ['suspended'], to: 'live', action: 'reinstated', extra: ', review_note = NULL' }), auth);

  r.get('/api/admin/bookings', async ({ db, query }) => {
    const v = validate(query, { status: oneOf(['held', 'confirmed', 'cancelled', 'expired', 'upcoming']), propertyId: str({ max: 64 }), q: str({ max: 80 }) });
    const where = [];
    const params = [];
    const add = (sql, value) => {
      params.push(value);
      where.push(sql.replaceAll('?', `$${params.length}`));
    };
    if (v.status === 'upcoming') add("b.status = 'confirmed' AND b.check_out > ?", todayIST());
    else if (v.status) add('b.status = ?', v.status);
    if (v.propertyId) add('b.property_id = ?', v.propertyId);
    if (v.q) add("(b.id ILIKE ? OR b.guest->>'phone' ILIKE ? OR lower(b.guest->>'email') ILIKE ?)", `%${v.q}%`);
    const { rows } = await db.query(
      `SELECT b.* FROM bookings b ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY b.created_at DESC LIMIT 200`,
      params,
    );
    return { bookings: rows.map((b) => bookingOut(b, 'admin')) };
  }, auth);

  // Support-initiated cancellation (e.g. the property cannot honour the stay): full refund.
  r.post('/api/admin/bookings/:id/cancel', async ({ db, params, body }) => {
    const v = validate(body, { reason: text({ max: 500, required: true }) });
    const updated = await db.tx(async (t) => {
      const { rows } = await t.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [params.id]);
      const b = rows[0];
      if (!b) throw notFound('Booking');
      if (!['held', 'confirmed'].includes(b.status)) throw conflict('not_cancellable', `This booking is already ${b.status}`);
      return cancelBooking(t, b, { refund: b.total_amount, by: 'admin', reason: v.reason });
    });
    return { booking: bookingOut(updated, 'admin') };
  }, auth);
}
