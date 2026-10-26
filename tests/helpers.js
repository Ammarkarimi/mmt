/* Test harness: a fresh database + API server per test file. */
import { createServer } from 'node:http';
import { createApp } from '../server/app.js';
import { loadConfig } from '../server/config.js';
import { openDatabase } from '../server/db/index.js';
import { addDays, dayOfWeek, todayIST } from '../server/lib/dates.js';

export const ADMIN = { email: 'ops@test.dev', password: 'admin-pass-123' };

async function resetPostgres(url) {
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await client.end();
}

export async function startServer({ seed = false, env = {} } = {}) {
  const url = process.env.TEST_DATABASE_URL || '';
  if (url) await resetPostgres(url);
  const config = loadConfig({
    DATABASE_URL: url,
    JWT_SECRET: 'test-secret-that-is-long-enough-for-hs256',
    SEED_DEMO: seed ? '1' : '0',
    ADMIN_EMAIL: ADMIN.email,
    ADMIN_PASSWORD: ADMIN.password,
    ...env,
  });
  const db = await openDatabase(config);
  const app = createApp({ config, db });
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const api = async (method, path, { body, token } = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, data: await res.json() };
  };
  return {
    api,
    base,
    db,
    config,
    close: async () => {
      await new Promise((resolve) => server.close(resolve));
      await db.close();
    },
  };
}

/** The first date at least `minAhead` days from today falling on weekday `dow` (0 = Sunday). */
export function nextWeekday(dow, minAhead = 7) {
  let d = addDays(todayIST(), minAhead);
  while (dayOfWeek(d) !== dow) d = addDays(d, 1);
  return d;
}

export const qs = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v !== undefined)).toString();

export async function customerToken(api, phone, name) {
  const otp = await api('POST', '/api/auth/otp', { body: { phone } });
  const res = await api('POST', '/api/auth/otp/verify', { body: { phone, code: otp.data.demoCode, name } });
  return res.data.token;
}

export async function partnerToken(api, email, name = 'Test Partner') {
  const res = await api('POST', '/api/auth/partner/signup', { body: { name, email, phone: '9876543210', password: 'secret-pass-1' } });
  return res.data.token;
}

export const adminToken = async (api) => (await api('POST', '/api/auth/login', { body: ADMIN })).data.token;

export const FULL_DETAILS = {
  propertyType: 'Hotel',
  starRating: 3,
  description: 'A friendly city hotel close to the market, with clean rooms, fast Wi-Fi and a rooftop cafe.',
  address: '12 Market Road',
  locality: 'Old Town',
  city: 'Testpur',
  state: 'Goa',
  pincode: '403001',
  scene: 'city',
  checkInTime: '14:00',
  checkOutTime: '11:00',
  amenities: ['wifi', 'ac', 'restaurant', 'parking'],
  policies: { cancellation: 'flexible', coupleFriendly: true },
  contact: { managerName: 'Asha', phone: '9822001122', email: 'frontdesk@example.com' },
  legal: { legalName: 'Testpur Hospitality LLP', pan: 'AAAFT1234K', accountName: 'Testpur Hospitality LLP', accountNumber: '123456789012', ifsc: 'SAHY0001234', agreementAccepted: true },
};

/** Create, submit and approve a property with one room type. Returns ids for booking. */
export async function liveProperty(api, ptoken, atoken, { name = 'Test Hotel', city = 'Testpur', room = {}, details = {} } = {}) {
  const created = await api('POST', '/api/partner/properties', { token: ptoken, body: { name, ...FULL_DETAILS, city, ...details } });
  const id = created.data.property.id;
  const withRoom = await api('POST', `/api/partner/properties/${id}/rooms`, {
    token: ptoken,
    body: { name: 'Deluxe Room', totalRooms: 5, basePrice: 4000, maxAdults: 3, maxOccupancy: 4, extraAdultPrice: 800, ratePlans: [{ name: 'Room Only', mealPlan: 'EP', priceDelta: 0 }, { name: 'With Breakfast', mealPlan: 'CP', priceDelta: 500 }], ...room },
  });
  await api('POST', `/api/partner/properties/${id}/submit`, { token: ptoken });
  await api('POST', `/api/admin/properties/${id}/approve`, { token: atoken, body: {} });
  const r = withRoom.data.rooms[withRoom.data.rooms.length - 1];
  return { propertyId: id, roomTypeId: r.id, planIds: r.ratePlans.map((p) => p.id), room: r };
}
