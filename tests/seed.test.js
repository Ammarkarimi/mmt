import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { DEMO_ADMIN, DEMO_PARTNER } from '../server/db/seed.js';
import { nextWeekday, qs, startServer } from './helpers.js';

let s;
before(async () => {
  s = await startServer({ seed: true });
});
after(() => s.close());

test('demo data seeds live listings in every city with working logins', async () => {
  const checkin = nextWeekday(2, 10);
  const goa = await s.api('GET', `/api/hotels/search?${qs({ city: 'Goa', checkin })}`);
  assert.equal(goa.status, 200);
  assert.equal(goa.data.count, 6);
  const stays = await s.api('GET', `/api/hotels/search?${qs({ city: 'Paris', category: 'homestay', checkin })}`);
  assert.equal(stays.data.count, 2);
  const detail = await s.api('GET', `/api/hotels/${goa.data.results[0].id}?${qs({ checkin })}`);
  assert.ok(detail.data.rooms.length >= 3);
  assert.equal(detail.data.reviews.length, 3);

  const partner = await s.api('POST', '/api/auth/login', { body: { email: DEMO_PARTNER.email, password: DEMO_PARTNER.password } });
  assert.equal(partner.data.user.role, 'partner');
  const dash = await s.api('GET', '/api/partner/dashboard', { token: partner.data.token });
  assert.ok(dash.data.properties.some((p) => p.status === 'pending_review'));
  const admin = await s.api('POST', '/api/auth/login', { body: { email: DEMO_ADMIN.email, password: DEMO_ADMIN.password } });
  const queue = await s.api('GET', '/api/admin/properties?status=pending_review', { token: admin.data.token });
  assert.equal(queue.data.properties.length, 1);
});
