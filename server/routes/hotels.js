/* Public hotel search and property details with live availability and prices. */
import { notFound } from '../http.js';
import { addDays, todayIST } from '../lib/dates.js';
import { date, int, oneOf, str, validate } from '../lib/validate.js';
import { MEAL_PLANS } from '../services/catalog.js';
import { expireHolds } from '../services/inventory.js';
import { checkStay, evaluateStays, planOut, publicProperty, roomOut } from '../services/listings.js';

/** Read stay dates and occupancy from the query string, defaulting to tomorrow for one night. */
export function stayFromQuery(query) {
  const v = validate(query, {
    checkin: date({ default: () => addDays(todayIST(), 1) }),
    checkout: date(),
    rooms: int({ min: 1, max: 8, default: 1 }),
    adults: int({ min: 1, max: 32, default: 2 }),
    children: int({ min: 0, max: 16, default: 0 }),
  });
  if (!v.checkout) v.checkout = addDays(v.checkin, 1);
  return checkStay(v);
}

const cheapest = (options) => options.reduce((best, o) => (!best || o.pp.price.gross < best.pp.price.gross ? o : best), null);

function searchCard(p, rooms) {
  const fitting = rooms.filter((r) => r.fits);
  if (!fitting.length) return null; // this property cannot host the party at all
  const bookable = fitting.filter((r) => r.bookable);
  const best = cheapest(bookable.flatMap((r) => r.plans.map((pp) => ({ r, pp }))));
  const shown = best || cheapest(fitting.flatMap((r) => r.plans.map((pp) => ({ r, pp }))));
  const plans = bookable.flatMap((r) => r.plans);
  const tags = [];
  if (plans.some((pp) => pp.policy.key !== 'non_refundable')) tags.push('Free Cancellation');
  if (plans.some((pp) => pp.plan.meal_plan !== 'EP')) tags.push('Breakfast Included');
  if (p.policies.coupleFriendly) tags.push('Couple Friendly');
  if (p.policies.payAtHotel) tags.push('Pay at Hotel');
  const pub = publicProperty(p);
  return {
    id: pub.id, name: pub.name, category: pub.category, type: pub.type, stars: pub.stars, city: pub.city, country: pub.country,
    locality: pub.locality, landmark: pub.landmark, scene: pub.scene, amenities: pub.amenities, photos: pub.photos,
    rating: pub.rating, ratingCount: pub.ratingCount,
    summary: p.description.length > 160 ? `${p.description.slice(0, 157).trimEnd()}…` : p.description,
    tags,
    soldOut: !best,
    roomsLeft: best && best.r.available <= 3 ? best.r.available : null,
    room: shown.r.room.name,
    plan: shown.pp.plan.name,
    perNight: shown.pp.price.perNight,
    perNightTax: shown.pp.price.perNightTax,
    stayTotal: shown.pp.price.gross,
  };
}

export default function hotelRoutes(r) {
  r.get('/api/hotels/search', async ({ db, query }) => {
    const { city, category } = validate(query, { city: str({ required: true, min: 2, max: 80 }), category: oneOf(['hotel', 'homestay'], { default: 'hotel' }) });
    const stay = stayFromQuery(query);
    await expireHolds(db);
    const { rows: props } = await db.query(
      "SELECT * FROM properties WHERE status = 'live' AND lower(city) = lower($1) AND category = $2 ORDER BY rating_count DESC, id LIMIT 300",
      [city, category],
    );
    const evaluated = await evaluateStays(db, props, stay);
    const results = props.map((p) => searchCard(p, evaluated.get(p.id))).filter(Boolean);
    results.sort((a, b) => Number(a.soldOut) - Number(b.soldOut)); // keep popularity order, sold-out last
    return { city, category, stay, count: results.length, results };
  });

  r.get('/api/hotels/:id', async ({ db, params, query }) => {
    const stay = stayFromQuery(query);
    await expireHolds(db);
    const p = (await db.query("SELECT * FROM properties WHERE id = $1 AND status = 'live'", [params.id])).rows[0];
    if (!p) throw notFound('Property');
    const rooms = (await evaluateStays(db, [p], stay)).get(p.id);
    const { rows: reviews } = await db.query(
      'SELECT author_name, rating, comment, stayed_on, created_at FROM reviews WHERE property_id = $1 ORDER BY created_at DESC LIMIT 10',
      [p.id],
    );
    return {
      property: publicProperty(p),
      stay,
      rooms: rooms.map(({ room, plans, available, fits, bookable }) => {
        const { totalRooms, basePrice, weekendPrice, active, ratePlans, ...pub } = roomOut(room);
        return {
          ...pub,
          available,
          fits,
          bookable,
          ratePlans: plans.map(({ plan, price, policy }) => ({
            ...planOut(plan),
            inclusions: MEAL_PLANS[plan.meal_plan].inclusions,
            policy,
            perNight: price.perNight,
            perNightTax: price.perNightTax,
            roomCharges: price.roomCharges,
            taxes: price.taxes,
            total: price.gross,
          })),
        };
      }),
      reviews: reviews.map((x) => ({ author: x.author_name, rating: x.rating, comment: x.comment, stayedOn: x.stayed_on, createdAt: x.created_at })),
    };
  });
}
