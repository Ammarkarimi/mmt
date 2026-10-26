/*
 * Demo data: live hotels and homestays in every city the website offers, owned by partner
 * accounts, plus demo partner/admin logins. Generation is deterministic (seeded RNG, stable
 * IDs) so every serverless instance of the in-memory demo database holds identical data.
 */
import { hashPassword, newId } from '../lib/security.js';

export const DEMO_PARTNER = { id: 'usr_demo_partner', email: 'partner@tripsaathi.dev', password: 'partner123', name: 'Rhea Fernandes', phone: '9820012345' };
export const DEMO_ADMIN = { id: 'usr_demo_admin', email: 'admin@tripsaathi.dev', password: 'admin123', name: 'TripSaathi Ops' };
const SEED_OWNER = { id: 'usr_seed_partners', email: 'listings@tripsaathi.dev', name: 'TripSaathi Partner Network' };

// name, country, state, scene, nightly price tier (INR), localities, landmark, lat, lon, PIN prefix
const CITIES = [
  ['Goa', 'India', 'Goa', 'beach', 3200, ['Calangute', 'Baga', 'Candolim', 'Anjuna', 'Panaji', 'Colva', 'Vagator'], 'Baga Beach', 15.55, 73.76, '403'],
  ['New Delhi', 'India', 'Delhi', 'heritage', 3600, ['Connaught Place', 'Aerocity', 'Karol Bagh', 'Paharganj', 'South Delhi', 'Chanakyapuri'], 'India Gate', 28.61, 77.21, '110'],
  ['Mumbai', 'India', 'Maharashtra', 'city', 4200, ['Andheri', 'Juhu', 'Colaba', 'Bandra', 'Powai', 'Lower Parel'], 'Gateway of India', 19.08, 72.88, '400'],
  ['Bengaluru', 'India', 'Karnataka', 'city', 3400, ['MG Road', 'Indiranagar', 'Whitefield', 'Koramangala', 'Electronic City'], 'Cubbon Park', 12.97, 77.59, '560'],
  ['Jaipur', 'India', 'Rajasthan', 'heritage', 2800, ['C-Scheme', 'MI Road', 'Amer', 'Malviya Nagar', 'Bani Park'], 'Hawa Mahal', 26.91, 75.79, '302'],
  ['Manali', 'India', 'Himachal Pradesh', 'mountain', 2400, ['Old Manali', 'Mall Road', 'Solang Valley', 'Vashisht', 'Aleo'], 'Mall Road', 32.24, 77.19, '175'],
  ['Udaipur', 'India', 'Rajasthan', 'lake', 3600, ['Lake Pichola', 'City Palace Area', 'Fateh Sagar', 'Hiran Magri'], 'Lake Pichola', 24.59, 73.71, '313'],
  ['Shimla', 'India', 'Himachal Pradesh', 'mountain', 2600, ['Mall Road', 'Kufri', 'Chotta Shimla', 'Mashobra'], 'The Ridge', 31.1, 77.17, '171'],
  ['Rishikesh', 'India', 'Uttarakhand', 'river', 2200, ['Tapovan', 'Laxman Jhula', 'Ram Jhula', 'Shivpuri'], 'Laxman Jhula', 30.09, 78.27, '249'],
  ['Munnar', 'India', 'Kerala', 'tea', 2900, ['Chithirapuram', 'Pallivasal', 'Devikulam', 'Town Centre'], 'Tea Museum', 10.09, 77.06, '685'],
  ['Ooty', 'India', 'Tamil Nadu', 'tea', 2500, ['Charing Cross', 'Fern Hill', 'Lovedale', 'Coonoor Road'], 'Ooty Lake', 11.41, 76.7, '643'],
  ['Mussoorie', 'India', 'Uttarakhand', 'mountain', 2700, ['Mall Road', 'Landour', 'Kempty Road', 'Library Chowk'], 'Gun Hill', 30.46, 78.07, '248'],
  ['Hyderabad', 'India', 'Telangana', 'heritage', 3100, ['Banjara Hills', 'HITEC City', 'Gachibowli', 'Secunderabad'], 'Charminar', 17.39, 78.49, '500'],
  ['Chennai', 'India', 'Tamil Nadu', 'beach', 3000, ['T Nagar', 'Egmore', 'OMR', 'Guindy', 'Nungambakkam'], 'Marina Beach', 13.08, 80.27, '600'],
  ['Kolkata', 'India', 'West Bengal', 'heritage', 2700, ['Park Street', 'Salt Lake', 'New Town', 'Esplanade'], 'Victoria Memorial', 22.57, 88.36, '700'],
  ['Agra', 'India', 'Uttar Pradesh', 'heritage', 2500, ['Taj Ganj', 'Fatehabad Road', 'Sadar Bazaar'], 'Taj Mahal', 27.18, 78.01, '282'],
  ['Varanasi', 'India', 'Uttar Pradesh', 'river', 2300, ['Assi Ghat', 'Dashashwamedh', 'Cantonment', 'Godowlia'], 'Dashashwamedh Ghat', 25.32, 82.97, '221'],
  ['Darjeeling', 'India', 'West Bengal', 'tea', 2600, ['Mall Road', 'Gandhi Road', 'Ghoom', 'Lebong'], 'Tiger Hill', 27.04, 88.26, '734'],
  ['Leh', 'India', 'Ladakh', 'snow', 3000, ['Changspa', 'Fort Road', 'Main Bazaar', 'Skara'], 'Shanti Stupa', 34.15, 77.58, '194'],
  ['Srinagar', 'India', 'Jammu & Kashmir', 'lake', 3100, ['Dal Lake', 'Rajbagh', 'Boulevard Road', 'Nishat'], 'Dal Lake', 34.08, 74.8, '190'],
  ['Pondicherry', 'India', 'Puducherry', 'beach', 2900, ['White Town', 'Auroville', 'Promenade', 'Serenity Beach'], 'Promenade Beach', 11.94, 79.83, '605'],
  ['Alleppey', 'India', 'Kerala', 'lake', 3300, ['Punnamada', 'Marari', 'Kainakary', 'Finishing Point'], 'Vembanad Lake', 9.5, 76.34, '688'],
  ['Coorg', 'India', 'Karnataka', 'forest', 3400, ['Madikeri', 'Kushalnagar', 'Virajpet', 'Siddapur'], 'Abbey Falls', 12.42, 75.74, '571'],
  ['Dubai', 'United Arab Emirates', 'Dubai', 'city', 7800, ['Deira', 'Bur Dubai', 'Downtown', 'Dubai Marina', 'Jumeirah'], 'Downtown Dubai', 25.2, 55.27, ''],
  ['Bangkok', 'Thailand', 'Bangkok', 'city', 4600, ['Sukhumvit', 'Silom', 'Pratunam', 'Riverside', 'Khao San'], 'Grand Palace', 13.76, 100.5, ''],
  ['Singapore', 'Singapore', 'Singapore', 'city', 9800, ['Marina Bay', 'Orchard', 'Little India', 'Sentosa', 'Chinatown'], 'Marina Bay', 1.29, 103.85, ''],
  ['Bali', 'Indonesia', 'Bali', 'island', 5200, ['Seminyak', 'Ubud', 'Kuta', 'Nusa Dua', 'Canggu'], 'Seminyak Beach', -8.69, 115.17, ''],
  ['Maldives', 'Maldives', 'Kaafu Atoll', 'island', 16500, ['North Male Atoll', 'South Male Atoll', 'Maafushi', 'Baa Atoll'], 'Male', 4.18, 73.51, ''],
  ['Phuket', 'Thailand', 'Phuket', 'beach', 4800, ['Patong', 'Kata', 'Karon', 'Phuket Town'], 'Patong Beach', 7.89, 98.3, ''],
  ['London', 'United Kingdom', 'England', 'city', 14500, ['Kensington', 'Westminster', 'Paddington', 'Covent Garden'], 'Hyde Park', 51.51, -0.13, ''],
  ['Paris', 'France', 'Île-de-France', 'city', 13800, ['Le Marais', 'Montmartre', 'Saint-Germain', 'Opera'], 'Eiffel Tower', 48.86, 2.35, ''],
];

const HOTEL_NAMES = [
  'Saffron Stays', 'The Neem Tree', 'Marigold Residency', 'Cedar Crest', 'Azure Sands Resort', 'Kesar Haveli', 'The Urban Nest',
  'Silver Oak Suites', 'Palm Grove Inn', 'Moonstone Boutique Hotel', 'Jasmine Court', 'The Riverstone', 'Teak & Timber Lodge',
  'Seven Hills Retreat', 'Orchid Bloom Hotel', 'Lotus Courtyard', 'The Banyan Retreat', 'Amber Palace Hotel', 'Coral Bay Resort',
  'The Peepal Inn', 'Indigo Heights', 'Sandalwood Suites', 'The Monsoon House', 'Ivory Tower Hotel', 'Golden Pagoda Inn',
  'Willow Creek Resort', 'Starlight Grand', 'The Copper Kettle', 'Emerald Bay Hotel', 'Mango Tree Residency',
];
const HOMESTAY_NAMES = [
  'Cloud Nine Homestay', "Grandma's Cottage", 'The Pine Cabin', 'Blue Door Villa', 'Hilltop Hideaway', 'Casa Serena',
  'The Orchard House', 'Firefly Farmstay', 'Laughing Waters Villa', 'Courtyard Bungalow', 'Wildflower Cottage',
  'Riverbend Homestay', 'Sunset Terrace Villa', 'The Attic Loft', 'Mistwood Cabin', 'Tamarind Villa', 'Bamboo Grove Stay',
  "The Writer's Retreat", 'Peacock Garden Villa', "Monk's Rest Homestay",
];
const REVIEWERS = ['Ananya', 'Rohit', 'Meera', 'Kabir', 'Ishita', 'Vikram', 'Sana', 'Arjun', 'Neha', 'Dev', 'Pooja', 'Farhan'];
const REVIEW_TEXTS = [
  'Spotless rooms and a really warm staff. Breakfast spread had good local options.',
  'Great location – we could walk to most places. Check-in was quick and smooth.',
  'Value for money stay. The room was a little smaller than expected but very clean.',
  'Loved the view from our balcony! Will definitely come back with family.',
  'Comfortable beds and quiet surroundings. Wi-Fi was fast enough for work calls.',
  'Helpful front desk who arranged a cab and sightseeing for us at a fair price.',
  'Food at the restaurant was delicious. Pool area was well maintained.',
  'Hosts went out of their way to make us feel at home. Felt like visiting family.',
];
const BLURBS = [
  (c) => `Walking distance to ${c.landmark}.`, () => 'Rooftop dining with panoramic views.', () => 'Loved by couples for its privacy.',
  () => 'Family-friendly with spacious rooms.', () => 'Recently renovated rooms with modern interiors.', () => 'Great value for money.',
  () => 'A peaceful location away from the crowds.',
];
const LEISURE = ['beach', 'island', 'mountain', 'lake', 'forest', 'tea', 'snow', 'river'];

/* ---------------------------------------------------------------- deterministic RNG */
const hash = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
const mulberry = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (r, a) => a[Math.floor(r() * a.length)];
const shuffle = (r, a) => {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};
const money = (x) => Math.max(499, Math.round(x / 10) * 10 - 1);
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

/* ---------------------------------------------------------------- generator */
export function buildDemoData(now = new Date()) {
  const properties = [];
  const rooms = [];
  const plans = [];
  const reviews = [];
  CITIES.forEach(([name, country, state, scene, tier, localities, landmark, lat, lon, pin], ci) => {
    const city = { name, country, state, scene, tier, localities, landmark, lat, lon, pin };
    const r = mulberry(hash(`seed:${name}`));
    const big = ci < 16;
    const hotelNames = shuffle(r, HOTEL_NAMES);
    const stayNames = shuffle(r, HOMESTAY_NAMES);
    const counts = { hotel: big ? 6 : 3, homestay: big ? 3 : 2 };
    for (const category of ['hotel', 'homestay']) {
      for (let i = 0; i < counts[category]; i++) {
        const homestay = category === 'homestay';
        const id = `prp_${slug(name)}_${homestay ? 's' : 'h'}${String(i + 1).padStart(2, '0')}`;
        const stars = homestay ? pick(r, [0, 0, 3, 4]) : pick(r, [2, 3, 3, 3, 4, 4, 4, 5, 5]);
        const sv = stars || 3;
        const locality = pick(r, localities);
        const price = money(tier * (0.42 + sv * 0.27) * (0.72 + r() * 0.62) * (homestay ? 0.9 : 1));
        const resortish = LEISURE.includes(scene);
        const type = homestay ? pick(r, ['Homestay', 'Villa', 'Cottage', 'Apartment', 'Homestay']) : stars >= 4 && resortish && r() < 0.45 ? 'Resort' : pick(r, ['Hotel', 'Hotel', 'Hotel', 'Boutique Hotel']);
        const amenities = ['wifi'];
        for (const a of ['pool', 'parking', 'restaurant', 'ac', 'gym', 'spa', 'bar', 'roomservice', 'kitchen']) {
          const p = { pool: sv >= 4 ? 0.75 : 0.2, spa: sv >= 4 ? 0.6 : 0.1, gym: sv >= 4 ? 0.7 : 0.25, bar: sv >= 4 ? 0.6 : 0.2, kitchen: homestay ? 0.85 : 0.08 }[a] ?? 0.65;
          if (r() < p) amenities.push(a);
        }
        const cancellation = r() < 0.6 ? 'flexible' : r() < 0.6 ? 'moderate' : 'non_refundable';
        const propName = (homestay ? stayNames : hotelNames)[i];
        const rating = Math.round(Math.min(4.9, Math.max(3.4, 3.3 + sv * 0.16 + r() * 0.85)) * 10) / 10;
        properties.push({
          id,
          owner_id: name === 'Goa' ? DEMO_PARTNER.id : SEED_OWNER.id,
          status: 'live',
          name: propName,
          category,
          property_type: type,
          star_rating: stars,
          description: `${propName} is a ${stars ? `${stars}-star ` : ''}${type.toLowerCase()} in ${locality}, ${name}. ${pick(r, BLURBS)(city)} Rooms are cleaned daily and our team is happy to help with local sightseeing, airport pick-ups and dining recommendations.`,
          address: `${10 + Math.floor(r() * 180)}, ${pick(r, ['Main Road', 'Beach Road', 'Station Road', 'Lake View Road', 'Temple Street', 'Hill Road'])}, ${locality}`,
          locality,
          city: name,
          state,
          country,
          pincode: pin ? pin + String(100 + Math.floor(r() * 899)) : '',
          landmark: `${(0.2 + r() * 6).toFixed(1)} km from ${landmark}`,
          latitude: Math.round((lat + (r() - 0.5) * 0.06) * 1e5) / 1e5,
          longitude: Math.round((lon + (r() - 0.5) * 0.06) * 1e5) / 1e5,
          scene,
          check_in_time: pick(r, ['14:00', '14:00', '13:00', '12:00']),
          check_out_time: pick(r, ['12:00', '12:00', '11:00']),
          amenities,
          photos: [],
          policies: { cancellation, coupleFriendly: r() < 0.6, payAtHotel: r() < 0.3, petsAllowed: r() < 0.15, smokingAllowed: false, localIdsAllowed: r() < 0.7 },
          contact: { managerName: pick(r, REVIEWERS) + ' ' + pick(r, ['Shetty', 'Kapoor', 'Nair', 'Das', 'Iyer', 'Khan', 'Mehta']), phone: `98${String(10000000 + Math.floor(r() * 89999999))}`, email: `stay@${slug(propName)}.example` },
          legal: { legalName: `${propName} Hospitality LLP`, pan: 'AAAFS' + String(1000 + Math.floor(r() * 8999)) + 'K', gstin: '', accountName: `${propName} Hospitality LLP`, accountNumber: String(10000000000 + Math.floor(r() * 8999999999)), ifsc: 'SAHY0001234', agreementAccepted: true },
          commission_pct: 15,
          rating_avg: rating,
          rating_count: 60 + Math.floor(r() * 4200),
          submitted_at: now.toISOString(),
          approved_at: now.toISOString(),
        });

        const roomDefs = homestay
          ? [
              { name: `Entire ${type}`, bed: '2 Queen Beds', size: 650 + Math.floor(r() * 500), total: 1, base: 4, maxA: 6, maxC: 3, maxO: 8, extra: Math.round(price * 0.25 / 50) * 50, mult: 2.2 },
              { name: 'Private Room', bed: 'Queen Bed', size: 200 + Math.floor(r() * 80), total: 2 + Math.floor(r() * 3), base: 2, maxA: 2, maxC: 1, maxO: 3, extra: 0, mult: 0.8 },
            ]
          : [
              { name: 'Standard Room', bed: 'Queen Bed', size: 180 + Math.floor(r() * 40), total: 6 + Math.floor(r() * 15), base: 2, maxA: 2, maxC: 1, maxO: 3, extra: 0, mult: 1 },
              { name: 'Deluxe Room', bed: 'King Bed', size: 260 + Math.floor(r() * 60), total: 4 + Math.floor(r() * 9), base: 2, maxA: 3, maxC: 2, maxO: 4, extra: Math.round(price * 0.22 / 50) * 50, mult: 1.32 },
              sv >= 4
                ? { name: 'Premium Suite', bed: 'King Bed + Living Area', size: 480 + Math.floor(r() * 120), total: 2 + Math.floor(r() * 4), base: 2, maxA: 3, maxC: 2, maxO: 4, extra: Math.round(price * 0.3 / 50) * 50, mult: 1.9 }
                : { name: 'Family Room', bed: '2 Queen Beds', size: 380 + Math.floor(r() * 80), total: 2 + Math.floor(r() * 5), base: 2, maxA: 4, maxC: 2, maxO: 5, extra: Math.round(price * 0.2 / 50) * 50, mult: 1.6 },
            ];
        const views = ['City View', 'Garden View', resortish ? 'Valley View' : 'Pool View', scene === 'beach' || scene === 'island' ? 'Sea View' : 'Courtyard View'];
        roomDefs.forEach((d, k) => {
          const rtId = `rt_${id.slice(4)}_${k + 1}`;
          const rp = money(price * d.mult);
          rooms.push({
            id: rtId, property_id: id, name: d.name, description: '', bed_type: d.bed, view: pick(r, views), size_sqft: d.size,
            base_occupancy: d.base, max_adults: d.maxA, max_children: d.maxC, max_occupancy: d.maxO, extra_adult_price: d.extra,
            total_rooms: d.total, base_price: rp, weekend_price: resortish && r() < 0.6 ? money(rp * 1.15) : null,
            amenities: shuffle(r, ['TV', 'Tea/coffee maker', 'Work desk', 'In-room safe', 'Hair dryer', 'Mini fridge', 'Balcony']).slice(0, 3 + Math.floor(r() * 3)),
            photos: [], sort: k,
          });
          const refundable = cancellation !== 'non_refundable';
          const defs = [{ name: 'Room Only', meal: 'EP', delta: 0, refundable }];
          if (refundable && r() < 0.3) defs.push({ name: 'Non-refundable Saver', meal: 'EP', delta: -Math.round(rp * 0.1 / 10) * 10, refundable: false });
          defs.push({ name: 'Room with Breakfast', meal: 'CP', delta: Math.round(rp * 0.14 / 10) * 10, refundable });
          if (!homestay && sv >= 4 && r() < 0.4) defs.push({ name: 'Breakfast + Dinner', meal: 'MAP', delta: Math.round(rp * 0.32 / 10) * 10, refundable });
          defs.forEach((p, j) => plans.push({ id: `rp_${rtId.slice(3)}_${j + 1}`, room_type_id: rtId, name: p.name, meal_plan: p.meal, price_delta: p.delta, refundable: p.refundable, sort: j }));
        });

        for (let j = 0; j < 3; j++) {
          const daysAgo = 12 + j * 37 + Math.floor(r() * 20);
          const when = new Date(now.getTime() - daysAgo * 864e5);
          reviews.push({
            id: `rv_${id.slice(4)}_${j + 1}`, property_id: id, author_name: pick(r, REVIEWERS),
            rating: Math.max(3, Math.min(5, Math.round(rating + r() * 0.8 - 0.3))), comment: pick(r, REVIEW_TEXTS),
            stayed_on: new Date(when.getTime() - 3 * 864e5).toISOString().slice(0, 10), created_at: when.toISOString(),
          });
        }
      }
    }
  });

  // Two listings still in onboarding, so the extranet and the admin review queue have work in them.
  const goa = properties.find((p) => p.id === 'prp_goa_h01');
  properties.push(
    {
      ...goa, id: 'prp_goa_p01', owner_id: DEMO_PARTNER.id, status: 'pending_review', name: 'Seabreeze Courtyard', property_type: 'Boutique Hotel', star_rating: 3,
      description: 'Seabreeze Courtyard is a 12-room boutique hotel set around a shaded courtyard, a short walk from Candolim beach. Every room has a private sit-out, and breakfast is served under the frangipani trees.',
      locality: 'Candolim', landmark: '0.6 km from Candolim Beach', rating_avg: 0, rating_count: 0, approved_at: null,
      contact: { managerName: DEMO_PARTNER.name, phone: DEMO_PARTNER.phone, email: DEMO_PARTNER.email },
      legal: { legalName: 'Seabreeze Hospitality LLP', pan: 'AAKFS4821M', gstin: '30AAKFS4821M1Z5', accountName: 'Seabreeze Hospitality LLP', accountNumber: '50200012345678', ifsc: 'GANG0000412', agreementAccepted: true },
    },
    {
      ...goa, id: 'prp_goa_d01', owner_id: DEMO_PARTNER.id, status: 'draft', name: 'Palm Lane Homestay', category: 'homestay', property_type: 'Homestay', star_rating: 0,
      description: '', address: '', locality: 'Assagao', landmark: '', amenities: ['wifi'], rating_avg: 0, rating_count: 0, submitted_at: null, approved_at: null,
      contact: {}, legal: {},
    },
  );
  rooms.push({
    id: 'rt_goa_p01_1', property_id: 'prp_goa_p01', name: 'Courtyard Room', description: 'Ground-floor room opening onto the courtyard.', bed_type: 'Queen Bed', view: 'Garden View', size_sqft: 220,
    base_occupancy: 2, max_adults: 2, max_children: 1, max_occupancy: 3, extra_adult_price: 0, total_rooms: 12, base_price: 3899, weekend_price: 4499,
    amenities: ['TV', 'Tea/coffee maker', 'Balcony'], photos: [], sort: 0,
  });
  plans.push(
    { id: 'rp_goa_p01_1_1', room_type_id: 'rt_goa_p01_1', name: 'Room Only', meal_plan: 'EP', price_delta: 0, refundable: true, sort: 0 },
    { id: 'rp_goa_p01_1_2', room_type_id: 'rt_goa_p01_1', name: 'Room with Breakfast', meal_plan: 'CP', price_delta: 450, refundable: true, sort: 1 },
  );
  return { properties, rooms, plans, reviews };
}

const insertRows = (t, table, cols, rows) =>
  t.query(`INSERT INTO ${table} (${cols.map((c) => c[0]).join(', ')})
           SELECT ${cols.map((c) => c[0]).join(', ')} FROM jsonb_to_recordset($1::jsonb) AS x(${cols.map((c) => `${c[0]} ${c[1]}`).join(', ')})`, [JSON.stringify(rows)]);

export async function seedDemo(db, config, lockKey) {
  await db.tx(async (t) => {
    await t.query('SELECT pg_advisory_xact_lock($1)', [lockKey]);
    const { rows } = await t.query('SELECT count(*)::int AS n FROM properties');
    if (rows[0].n > 0) return;

    const [partnerHash, adminHash] = await Promise.all([hashPassword(DEMO_PARTNER.password), hashPassword(DEMO_ADMIN.password)]);
    await t.query(
      `INSERT INTO users (id, role, name, email, phone, password_hash) VALUES
         ($1, 'partner', $2, $3, $4, $5), ($6, 'admin', $7, $8, NULL, $9), ($10, 'partner', $11, $12, NULL, NULL)
       ON CONFLICT (id) DO NOTHING`,
      [DEMO_PARTNER.id, DEMO_PARTNER.name, DEMO_PARTNER.email, DEMO_PARTNER.phone, partnerHash, DEMO_ADMIN.id, DEMO_ADMIN.name, DEMO_ADMIN.email, adminHash, SEED_OWNER.id, SEED_OWNER.name, SEED_OWNER.email],
    );

    const data = buildDemoData();
    await insertRows(t, 'properties', [
      ['id', 'text'], ['owner_id', 'text'], ['status', 'text'], ['name', 'text'], ['category', 'text'], ['property_type', 'text'], ['star_rating', 'int'],
      ['description', 'text'], ['address', 'text'], ['locality', 'text'], ['city', 'text'], ['state', 'text'], ['country', 'text'], ['pincode', 'text'],
      ['landmark', 'text'], ['latitude', 'float8'], ['longitude', 'float8'], ['scene', 'text'], ['check_in_time', 'text'], ['check_out_time', 'text'],
      ['amenities', 'jsonb'], ['photos', 'jsonb'], ['policies', 'jsonb'], ['contact', 'jsonb'], ['legal', 'jsonb'], ['commission_pct', 'int'],
      ['rating_avg', 'real'], ['rating_count', 'int'], ['submitted_at', 'timestamptz'], ['approved_at', 'timestamptz'],
    ], data.properties);
    await insertRows(t, 'room_types', [
      ['id', 'text'], ['property_id', 'text'], ['name', 'text'], ['description', 'text'], ['bed_type', 'text'], ['view', 'text'], ['size_sqft', 'int'],
      ['base_occupancy', 'int'], ['max_adults', 'int'], ['max_children', 'int'], ['max_occupancy', 'int'], ['extra_adult_price', 'int'],
      ['total_rooms', 'int'], ['base_price', 'int'], ['weekend_price', 'int'], ['amenities', 'jsonb'], ['photos', 'jsonb'], ['sort', 'int'],
    ], data.rooms);
    await insertRows(t, 'rate_plans', [
      ['id', 'text'], ['room_type_id', 'text'], ['name', 'text'], ['meal_plan', 'text'], ['price_delta', 'int'], ['refundable', 'boolean'], ['sort', 'int'],
    ], data.plans);
    await insertRows(t, 'reviews', [
      ['id', 'text'], ['property_id', 'text'], ['author_name', 'text'], ['rating', 'int'], ['comment', 'text'], ['stayed_on', 'date'], ['created_at', 'timestamptz'],
    ], data.reviews);
    await t.query(
      `INSERT INTO property_events (id, property_id, actor_id, action, note)
       SELECT 'evt_' || id, id, CASE status WHEN 'live' THEN $1 ELSE owner_id END,
              CASE status WHEN 'live' THEN 'approved' WHEN 'pending_review' THEN 'submitted' ELSE 'created' END,
              CASE status WHEN 'live' THEN 'Imported with demo data' END
         FROM properties`,
      [DEMO_ADMIN.id],
    );
  });
}

/** Create or update the admin account configured through ADMIN_EMAIL / ADMIN_PASSWORD. */
export async function ensureAdmin(db, config) {
  const { rows } = await db.query("SELECT id FROM users WHERE role = 'admin' AND lower(email) = $1", [config.adminEmail]);
  const hash = await hashPassword(config.adminPassword);
  if (rows[0]) await db.query('UPDATE users SET password_hash = $2 WHERE id = $1', [rows[0].id, hash]);
  else await db.query("INSERT INTO users (id, role, name, email, password_hash) VALUES ($1, 'admin', $2, $3, $4)", [newId('usr'), config.adminName, config.adminEmail, hash]);
}
