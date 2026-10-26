/*
 * Room inventory. Every booked or held room-night is counted in inventory.sold, so a room
 * type has   available = COALESCE(inventory.total, room_types.total_rooms) - sold   per night.
 *
 * reserve() takes rooms with a single conditional UPDATE. Under concurrency Postgres locks each
 * inventory row and re-checks the WHERE clause against the latest committed `sold`, so two guests
 * can never take the last room together. If any night is short the whole transaction rolls back.
 */
import { conflict } from '../http.js';
import { diffDays } from '../lib/dates.js';

const idList = (ids) => JSON.stringify([...new Set(ids)]);

/** Nightly availability and calendar prices for the given room types over [from, to). */
export async function loadCalendar(c, roomTypeIds, from, to) {
  const out = new Map(roomTypeIds.map((id) => [id, []]));
  if (!roomTypeIds.length) return out;
  const { rows } = await c.query(
    `SELECT rt.id AS room_type_id, d::date AS date,
            COALESCE(i.total, rt.total_rooms) AS total, COALESCE(i.sold, 0) AS sold,
            i.total IS NOT NULL AS total_override, i.price, COALESCE(i.stop_sell, false) AS stop_sell
       FROM room_types rt
       CROSS JOIN generate_series($2::date, $3::date - 1, interval '1 day') AS d
       LEFT JOIN inventory i ON i.room_type_id = rt.id AND i.date = d::date
      WHERE rt.id IN (SELECT jsonb_array_elements_text($1::jsonb))
      ORDER BY rt.id, d`,
    [idList(roomTypeIds), from, to],
  );
  for (const r of rows) {
    out.get(r.room_type_id).push({
      date: r.date,
      total: r.total,
      sold: r.sold,
      available: r.stop_sell ? 0 : Math.max(0, r.total - r.sold),
      price: r.price,
      stopSell: r.stop_sell,
      totalOverride: r.total_override,
    });
  }
  return out;
}

export const minAvailable = (nights) => (nights.length ? Math.min(...nights.map((n) => n.available)) : 0);

/** Take `rooms` rooms of a room type for every night in [checkIn, checkOut). */
export async function reserve(t, roomTypeId, checkIn, checkOut, rooms) {
  const nights = diffDays(checkOut, checkIn);
  await t.query(
    `INSERT INTO inventory (room_type_id, date)
     SELECT $1, d::date FROM generate_series($2::date, $3::date - 1, interval '1 day') AS d
     ON CONFLICT DO NOTHING`,
    [roomTypeId, checkIn, checkOut],
  );
  const r = await t.query(
    `UPDATE inventory i SET sold = i.sold + $4
       FROM room_types rt
      WHERE rt.id = i.room_type_id AND i.room_type_id = $1
        AND i.date >= $2::date AND i.date < $3::date
        AND NOT i.stop_sell
        AND COALESCE(i.total, rt.total_rooms) - i.sold >= $4`,
    [roomTypeId, checkIn, checkOut, rooms],
  );
  if (r.rowCount !== nights) {
    throw conflict('sold_out', rooms > 1 ? `Sorry, ${rooms} rooms of this type are not available for all your nights` : 'Sorry, this room just sold out for your dates');
  }
}

/** Give rooms back (cancellation or an expired hold). */
export async function release(t, booking) {
  await t.query(
    `UPDATE inventory SET sold = GREATEST(0, sold - $4)
      WHERE room_type_id = $1 AND date >= $2::date AND date < $3::date`,
    [booking.room_type_id, booking.check_in, booking.check_out, booking.rooms],
  );
}

let lastSweep = 0;

/**
 * Expire unpaid holds and release their rooms. Runs lazily before availability reads (at most
 * every 20 s per instance unless forced) so no background scheduler is required.
 */
export async function expireHolds(db, { force = false } = {}) {
  if (!force && Date.now() - lastSweep < 20_000) return 0;
  lastSweep = Date.now();
  return db.tx(async (t) => {
    const { rows } = await t.query(
      `UPDATE bookings SET status = 'expired', updated_at = now()
        WHERE status = 'held' AND hold_expires_at < now()
        RETURNING id, room_type_id, check_in, check_out, rooms`,
    );
    for (const b of rows) await release(t, b);
    return rows.length;
  });
}
