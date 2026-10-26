# TripSaathi hotel backend

This backend handles two flows:

1. **How hotels come onto TripSaathi.** A hotelier creates a partner account, adds a property with its rooms, rate plans, legal and bank details, and submits it for review. A TripSaathi admin approves it, and the property goes live. From then on the partner manages prices and availability from a calendar.
2. **How guests book rooms.** A guest searches live inventory and opens a property. The server prices each room and rate plan. The guest logs in with an OTP, the rooms are held for 15 minutes while they pay, and the booking is confirmed. The guest can later cancel (refund per policy) or review the stay.

It is plain Node.js (no framework) on PostgreSQL. It runs as one Vercel Function (`api/index.js`) or locally with `npm run dev`.

```
public/            static website (unchanged hosting model)
  partner.html     Partner Hub – onboarding & management UI
  admin.html       Admin console – listing review & bookings
api/index.js       Vercel Function entry; every /api/* request is routed here
server/
  app.js           routing, auth, body parsing, error handling
  config.js        environment variables
  db/              Postgres + PGlite adapters, migrations, demo seed
  lib/             validation, dates (IST), tokens/passwords/OTP/IDs
  services/        pricing & GST, coupons, cancellation policies, inventory, listings, bookings, payments, SMS
  routes/          auth, hotels (public), bookings (guest), partner, admin, system
scripts/dev.js     local server for public/ + API
tests/             node:test suites (run on PGlite or a real Postgres)
```

## 1. Hotel onboarding

```
 partner signs up ──► creates property (draft) ──► fills 7 steps ──► submits
                                                                     │
                       ┌──────────── rejected (with reason) ◄────────┤ admin reviews
                       ▼                                             ▼
                 partner fixes & resubmits                    live (bookable)
                                                                     │
                                                admin can suspend ◄──┴──► reinstate
```

| Status | Meaning | Who moves it |
|---|---|---|
| `draft` | Being filled in by the partner | partner creates |
| `pending_review` | Submitted; waiting for TripSaathi | partner submits (only if the checklist is complete) |
| `live` | Visible in search and bookable | admin approves (sets commission %) |
| `rejected` | Changes requested; the reason is shown to the partner | admin rejects |
| `suspended` | Hidden from search; existing bookings stay valid | admin suspends / reinstates |

**Onboarding checklist** (`services/listings.js → checklist`), enforced on submit and again on approval:
- Name, type and a description of at least 50 characters
- Address, locality and city, plus a 6-digit PIN code for Indian properties
- Contact mobile number and email
- At least 3 amenities
- Check-in/out times and a cancellation policy
- At least one room type with a rate plan
- Legal name, PAN and (optionally) a valid GSTIN
- Bank account name, number and IFSC
- Acceptance of the partner agreement

**Rooms and rate plans.**
- A *room type* has an inventory count, a base nightly price, an optional Friday/Saturday price, occupancy limits (base, max adults, max children, max guests) and an extra-adult charge.
- A *rate plan* sells that room with a meal plan (EP room only, CP breakfast, MAP, AP) and a price delta, and is either refundable or non-refundable.
- Rate plans and room types used by past bookings are deactivated rather than deleted. Bookings keep a snapshot of their names.

**Rates and inventory calendar.** A partner can change a date range, optionally limited to certain weekdays. For each date they can set:
- a price override,
- the number of rooms to sell (it cannot go below rooms already sold), or
- a stop-sell flag (closes the date).

## 2. Guest booking

```
search ─► property details ─► POST /quote ─► login (OTP) ─► POST /bookings (hold 15 min) ─► POST /pay ─► confirmed
                                                                    │ not paid in time               │
                                                                    └──► expired, rooms released     └──► cancel → refund per policy
```

- **Search and details** return only `live` properties. For the chosen dates and party size, each room type gets live availability and a fully computed price for every rate plan.
- **The quote** is the server's authoritative price, including the coupon. The browser never decides the price.
- **Hold** creates a `held` booking and takes the rooms out of inventory in the same transaction. A guest can hold at most `MAX_ACTIVE_HOLDS` (default 3) bookings at a time.
- **Pay** charges through the payment gateway adapter. A failed attempt is recorded and the booking stays `held`, so the guest can retry. Paying an already-confirmed booking just returns it, so a double click can't charge twice.
- **Expiry.** Unpaid holds expire after `HOLD_MINUTES`. This happens lazily before availability reads, and also via a daily Vercel Cron as a safety net. Their rooms are released.
- **Cancel** applies the rate plan's policy and records a refund. Admins can cancel with a full refund.
- **Review** is allowed once per booking, after check-out, and updates the property's rating.

### Preventing double bookings

Inventory has one row per room type per night: `sold` counts held and confirmed rooms, and `total` overrides the room type's count. A hold runs a single conditional statement:

```sql
UPDATE inventory i SET sold = i.sold + $rooms
  FROM room_types rt
 WHERE rt.id = i.room_type_id AND i.room_type_id = $id
   AND i.date >= $checkin AND i.date < $checkout
   AND NOT i.stop_sell AND COALESCE(i.total, rt.total_rooms) - i.sold >= $rooms
```

If fewer rows are updated than there are nights, the transaction rolls back with `409 sold_out`. Postgres row locks make concurrent holds queue on each night, and each one re-checks against the latest `sold`. In the test suite, 25 simultaneous guests competing for 3 rooms produced exactly 3 bookings.

### Pricing rules (`services/pricing.js`)

- **Nightly room rate:** calendar override, else the weekend price on Friday/Saturday nights, else the base price. The rate plan's delta is then added.
- **Extra adults:** guests are spread evenly across the rooms, and adults above the room's base occupancy pay the extra-adult charge.
- **GST** is set per room per night: **5% up to ₹7,500, 18% above** (rates from 22 Sep 2025). The slabs are configured in `GST_SLABS`.
- **Coupons** (`services/coupons.js`):
  - `TSSTAY`: 20% off, up to ₹2,000
  - `TSHOME`: ₹500 off, homestays only
  - `TSUPI`: ₹150 off, minimum ₹2,000
  - `TSCARD`: 10% off, up to ₹2,500

  Coupons are funded by TripSaathi, so they don't reduce the partner's payout.
- **Commission and payout:** commission is `commission_pct` (default 15%, set per property on approval) of room charges. Payout = room charges + taxes − commission.

### Cancellation policies (`services/policies.js`)

| Key | Free cancellation until | After that |
|---|---|---|
| `flexible` | 24 h before check-in | first night charged (its share of what was paid) |
| `moderate` | 5 days before | 50% charged |
| `strict` | 14 days before | no refund |
| `non_refundable` | never | no refund |

A non-refundable rate plan is always `non_refundable`, whatever the property's policy. Online cancellation closes at the check-in time (IST).

## 3. Data model

| Table | Purpose |
|---|---|
| `users` | Customers (unique mobile number), partners and admins (unique email, scrypt password hash, lockout after 5 failed logins) |
| `otp_codes` | Hashed one-time codes: 5 min expiry, 5 attempts, 5 requests per 15 min per number |
| `properties` | Listing details, policies/contact/legal as JSONB, status, commission, rating |
| `property_events` | Audit trail: created, submitted, approved, rejected, suspended, reinstated |
| `room_types`, `rate_plans` | What is sold, and the meal/refund options on top |
| `inventory` | Per-night `total` override, `sold`, `price` override, `stop_sell` |
| `bookings` | Stay, guest, full price breakdown, commission/payout, status, hold expiry, policy, display snapshot |
| `payments` | Charges and refunds, with masked details (card last 4, UPI ID, bank) only |
| `reviews` | One per completed booking, plus imported demo reviews |

Migrations live in `server/db/migrations.js`. They are append-only and applied automatically on start under an advisory lock. Dates are `date` columns handled as `YYYY-MM-DD` strings in IST, and money is whole rupees.

## 4. API reference

Every endpoint takes and returns JSON. Errors look like `{ "error": { "code", "message", "details?" } }`. Authenticated calls send `Authorization: Bearer <token>`.

**Auth & profile**

| Method & path | Who | Notes |
|---|---|---|
| `POST /api/auth/otp` `{phone}` | anyone | Sends a 6-digit OTP. In demo mode the response includes `demoCode` |
| `POST /api/auth/otp/verify` `{phone, code, name?}` | anyone | Creates or logs in a customer → `{token, user}` |
| `POST /api/auth/partner/signup` `{name, email, phone, password}` | anyone | Creates a partner → `{token, user}` |
| `POST /api/auth/login` `{email, password}` | partners, admins | → `{token, user}` |
| `GET / PATCH /api/me` | any user | Profile |

**Public**

| Method & path | Notes |
|---|---|
| `GET /api/hotels/search?city&checkin&checkout&rooms&adults&children&category=hotel\|homestay` | Live listings with cheapest bookable price, tags, rooms left; sold-out listings last |
| `GET /api/hotels/:id?checkin&checkout&rooms&adults&children` | Property, room types with availability and every rate plan priced for the stay, reviews |
| `GET /api/meta` | Vocabularies for forms: property types, amenities, meal plans, policies, GST slabs |
| `GET /api/health` | Database status and configuration warnings |

**Guest bookings** (customer token; `quote` is public)

| Method & path | Notes |
|---|---|
| `POST /api/bookings/quote` | `{propertyId, roomTypeId, ratePlanId, checkin, checkout, rooms, adults, children, coupon?}` → price, coupons, policy, availability |
| `POST /api/bookings` | Quote fields + `guest {firstName, lastName, gender?, email, phone}` + `specialRequests?` → `held` booking (`409 sold_out`, `409 too_many_holds`) |
| `POST /api/bookings/:id/pay` | `{method: upi\|card\|netbanking\|paylater, upiId?, cardLast4?, bank?}` → `confirmed` (`402 payment_failed`, `410 hold_expired`) |
| `GET /api/bookings`, `GET /api/bookings/:id` | My bookings with `stage`: upcoming, in_house, completed, cancelled |
| `GET /api/bookings/:id/cancellation` | Refund preview |
| `POST /api/bookings/:id/cancel` `{reason?}` | Cancel with refund |
| `POST /api/bookings/:id/review` `{rating 1-5, comment?}` | After check-out, once |

**Partner extranet** (partner token; only your own properties)

| Method & path | Notes |
|---|---|
| `GET /api/partner/dashboard` | Totals (revenue, payout, occupancy for the next 30 days), properties, upcoming arrivals |
| `GET / POST /api/partner/properties` | List / create a draft |
| `GET / PATCH / DELETE /api/partner/properties/:id` | Details + rooms + checklist + history. PATCH merges `policies`, `contact` and `legal`. Delete is allowed for drafts only |
| `POST /api/partner/properties/:id/submit` | `422 incomplete` lists what is missing |
| `POST /api/partner/properties/:id/rooms` | Room type with `ratePlans[]` (defaults to "Room Only") |
| `PATCH / DELETE /api/partner/rooms/:roomId` | `ratePlans[]` is upserted by `id`; plans you leave out are deactivated |
| `GET /api/partner/rooms/:roomId/calendar?from&days` | Per-night total, sold, available, rate, overrides |
| `PUT /api/partner/rooms/:roomId/calendar` | `{from, to, weekdays?, price?\|null, total?\|null, stopSell?}`; `null` resets to the default |
| `GET /api/partner/bookings?propertyId&status&from&to` | Bookings with guest contact, commission and payout |

**Admin** (admin token)

| Method & path | Notes |
|---|---|
| `GET /api/admin/stats` | Listings by status, users, GMV, commission, refunds |
| `GET /api/admin/properties?status&q` | Review queue (pending first) and search |
| `GET /api/admin/properties/:id` | Full listing, checklist, owner, history |
| `POST /api/admin/properties/:id/approve` `{commissionPct?}` | `pending_review → live` |
| `POST /api/admin/properties/:id/reject` `{reason}` | `pending_review → rejected` |
| `POST /api/admin/properties/:id/suspend` `{reason}` · `POST …/reinstate` | `live ⇄ suspended` |
| `GET /api/admin/bookings?status&q` · `POST /api/admin/bookings/:id/cancel` `{reason}` | Search; full-refund cancellation |

## 5. Configuration

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` / `POSTGRES_URL` | — | PostgreSQL connection string. Without it the API uses an in-memory PGlite database that is rebuilt and re-seeded on every cold start |
| `JWT_SECRET` | demo value | Required (32+ characters) when a database is configured |
| `SEED_DEMO` | `1` without a DB, `0` with one | Load the demo hotels and the demo partner/admin accounts |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | — | Creates or updates this admin account on start |
| `OTP_DEMO` | `1` | Return the OTP in the API response. Set it to `0` once SMS works |
| `SMS_WEBHOOK_URL` | — | The OTP SMS is POSTed here as `{to, message}`; point it at your SMS provider adapter |
| `HOLD_MINUTES` / `MAX_ACTIVE_HOLDS` | 15 / 3 | How long rooms are held, and how many holds a guest may have |
| `DEFAULT_COMMISSION_PCT` | 15 | Commission for new properties |
| `CRON_SECRET` | — | Protects `/api/cron/expire-holds` (Vercel Cron sends it automatically) |
| `PG_POOL_MAX` | 5 | Connections per function instance |

## 6. Running and testing

```bash
npm install
npm run dev                 # http://localhost:8080 – site + API on in-memory PGlite with demo data
DATABASE_URL=postgres://… JWT_SECRET=… npm run db:seed   # prepare a real database (schema + demo data)
npm test                    # 30 tests on PGlite
TEST_DATABASE_URL=postgres://localhost/tripsaathi_test npm test   # same suite on real Postgres (wipes that DB)
```

The tests cover:
- onboarding and validation, permissions between partners and roles, and the reject → resubmit → approve cycle
- search and pricing maths, coupons and OTP login
- holds and payments (including a declined card), plus a concurrent race for the last room
- hold expiry, limits on active holds, and cancellations with refunds
- calendar overrides and stop-sell, rate-plan edits, reviews, admin suspension and cancellation, and the demo seed

## 7. Deploying on Vercel with a real database

1. In the Vercel project: **Storage → Create Database → Neon (Postgres)** and connect it to the project. This adds `DATABASE_URL`.
2. Add `JWT_SECRET` (a long random string), `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `CRON_SECRET`.
3. Optional: set `SEED_DEMO=1` for the first deploy to load the demo hotels, then remove it.
4. Redeploy. Migrations run automatically on the first request.

## 8. Before taking real money

These are the integration points still mocked or simplified:

- **SMS OTP:** connect a provider through `SMS_WEBHOOK_URL` (or replace `services/notify.js`), then set `OTP_DEMO=0`.
- **Payments:** `services/payments.js` is a mock gateway: a card ending in `0002` or a UPI ID starting with `fail@` is declined. For Razorpay or a similar provider:
  - create an order when the hold is created,
  - confirm the booking from the verified payment webhook or signature check rather than inline,
  - issue refunds through the provider's API in `cancelBooking`.
- **Photos:** partners currently paste https links. Add uploads (e.g. Vercel Blob) plus moderation.
- **Sensitive data:** encrypt bank account numbers and PAN at rest (they are only ever returned masked), and keep KYC documents in private storage.
- **Notifications:** booking confirmation and cancellation emails/SMS to guests and partners. Payout statements and a payout ledger.
- **Abuse protection:** add edge rate limiting (Vercel Firewall) on the auth and booking endpoints, on top of the per-number OTP limits.
- **Re-review on change:** major edits to a live listing (name, address, bank details) should go back to review.
