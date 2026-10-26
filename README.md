# TripSaathi – *Har safar ka saathi*

<p align="center"><img src="assets/img/logo-dark.svg" alt="TripSaathi logo" width="320"></p>

**TripSaathi** is a full-featured online travel agency (OTA) modelled on the layout and booking flows of large Indian travel portals such as MakeMyTrip. It uses its **own brand, logo, copy and artwork**. None of MakeMyTrip's trademarks, images or text are used.

Hotels and homestays run on a real backend (Node.js + PostgreSQL):
- hoteliers list their properties, rooms and prices through the **Partner Hub**;
- TripSaathi staff approve listings in the **admin console**;
- guests search live inventory and book rooms with OTP login, a 15-minute room hold, payment and cancellation with refunds.

See **[docs/BACKEND.md](docs/BACKEND.md)** for the flows, data model, pricing/GST rules and API reference.

> "Saathi" means *companion* in Hindi. TripSaathi is your companion on every journey (*har safar ka saathi*).

## Brand

| | |
|---|---|
| **Name** | TripSaathi (short form **TS**, like "MMT") |
| **Tagline** | Har safar ka saathi |
| **Logo mark** | A rounded coral-to-pink gradient tile with a white paper plane leaving a dotted "journey" trail |
| **Wordmark** | lowercase **trip** (navy / white) + **saathi** (saffron-to-pink gradient) |
| **Colours** | Navy `#0B1437`, Saffron `#FF9A3D`, Coral `#FF5A4E`, Pink `#F0386B`, Action blue `#1A6CF0` |
| **Font** | Lato (Google Fonts) with system fallbacks |

Logo files: `assets/img/logo-dark.svg` (for light backgrounds), `assets/img/logo-light.svg` (for dark backgrounds) and `assets/img/favicon.svg`.

## What's included

**Home page** (`index.html`)
- A search widget with 10 products: Flights, Hotels, Homestays & Villas, Holiday Packages, Trains, Buses, Cabs, Visa, Forex Card & Currency, and Travel Insurance
- Flights: one way, round trip and multi-city (up to 5 legs), a fare calendar with the lowest price per day, travellers & class selection, and special fares (student, armed forces, senior citizen, doctors & nurses)
- Offers carousel with category tabs and copyable coupon codes, an app-download banner, popular routes, handpicked collections, trending holidays, offbeat destinations and a trust strip
- Login / sign-up modal using mobile number + OTP (any 6 digits work in the demo), with personal and business account tabs

**Results & details**
| Page | Highlights |
|---|---|
| `flights.html` | Filters for stops, departure/arrival time, price, airlines and refundable fares; sort tabs; a 7-day fare strip; SAVER / FLEXI / COMFORT+ fare cards; details tabs (flight, fare summary, cancellation, date change). Round trips use a split view with a sticky total bar; multi-city has leg tabs. |
| `hotels.html` | **Live from the API:** available properties with the cheapest bookable price, "only N left" and sold-out states; filters for price bands, stars, user rating, property type, amenities and locality, plus name search; sort options; shortlist (heart) |
| `hotel.html` | **Live from the API:** every room type and rate plan priced for your dates and guests (GST included), occupancy rules, cancellation policy, amenities, location, verified reviews, property rules |
| `holidays.html` | Theme tabs, duration / budget / region / hotel-star filters, day-wise itinerary modal |
| `trains.html` | Class-wise fares with availability (AVAILABLE / RAC / WL / REGRET), Tatkal tags, running days, schedule modal; PNR status and live train status from the home page |
| `buses.html` | Operator, type, time and rating filters; interactive seat map (sleeper decks or 2+2 seater); boarding and dropping points |
| `cabs.html` | Outstation one-way and round trip, airport transfers and hourly rentals; car categories with inclusions |

**Checkout** (`review.html`)
- Itinerary review, traveller forms (age for train/bus, passport for international flights), contact details and add-ons (insurance, zero cancellation)
- Coupon engine with validity and minimum-amount rules, TripCoins redemption, and a 15-minute session timer
- Payment modal (UPI, card, net banking, pay later) with validation, a processing state, and a confirmation page with booking ID
- **Hotel stays go through the API:**
  - the price and coupons are re-quoted on the server;
  - login is by mobile OTP;
  - the room is held for 15 minutes while you pay;
  - payment runs through the mock gateway (a card ending in `0002` is declined);
  - the booking is confirmed on the server.

**Account**
- `mytrips.html`: Upcoming / Cancelled / Completed tabs, details, e-ticket, and cancellation with a refund estimate. Hotel bookings come from the API, with server-calculated refunds and "Rate your stay" after check-out
- `offers.html`: all offers by category plus a coupon-code table

**For hotel partners** (`partner.html`, Partner Hub)
- Sign up, then add a property step by step:
  1. Basic info
  2. Location
  3. Amenities & house rules
  4. Photos
  5. Rooms & rate plans
  6. Contact, legal & bank details
  7. Review & submit (with a live checklist)
- Dashboard with revenue, payouts and occupancy; status of each listing (draft → under review → live, or changes requested)
- Rates & inventory calendar: weekend prices, per-date price overrides, rooms to sell and stop-sell, applied to date ranges and chosen weekdays
- Bookings list with guest details, commission and payout

**For TripSaathi staff** (`admin.html`, admin console)
- Review queue with each listing's full details, checklist and history: approve (setting the commission), request changes with a reason, suspend or reinstate
- Booking search across all properties, full-refund cancellation, and platform stats

Demo logins (in-memory demo database only):
- partner: `partner@tripsaathi.dev` / `partner123`
- admin: `admin@tripsaathi.dev` / `admin123`
- guests sign in with any mobile number; the OTP is shown on screen in demo mode

Every page is responsive down to 360px: on phones the filters slide in as a drawer, pickers open as bottom sheets and the search bar collapses.

## How it works

The website is plain HTML, CSS and vanilla JS with no build step, in `public/`. The hotel backend is plain Node.js on PostgreSQL, in `server/` and `api/`, and is served by a single Vercel Function.

- **Hotels & homestays:**
  - listings, rooms, prices, availability, logins and bookings live in PostgreSQL;
  - prices, GST, coupons, holds, payments and refunds are all computed on the server;
  - a conditional inventory update prevents double bookings.

  Details in [docs/BACKEND.md](docs/BACKEND.md).
- **Other products:**
  - `public/assets/js/data.js` holds airports, stations, cities, packages, offers and coupons;
  - flights, trains and buses are generated deterministically from a seeded RNG, so the same search always shows the same results;
  - their bookings, the shortlist and TripCoins are kept in `localStorage`.
- **Artwork:** every image is a procedurally generated SVG scene (beaches, mountains, cities, palaces, backwaters, rooms, pools…) drawn in `TS.scene()`. There are no external or copyrighted images, and listings without photos use these too.

```
public/                 the website (served as static files)
  index.html  flights.html  hotels.html  hotel.html  holidays.html  trains.html
  buses.html  cabs.html  review.html  mytrips.html  offers.html
  partner.html          Partner Hub (hotel onboarding & management)
  admin.html            admin console (listing review & bookings)
  assets/css/style.css  design system & all page styles
  assets/js/            data.js, common.js (utils, UI kit, API client, OTP login), search.js, <page>.js
api/index.js            Vercel Function: all /api/* requests
server/                 backend – app, config, db (migrations, seed), lib, services, routes
scripts/dev.js          local server for the site + API
tests/                  API tests (node:test)
docs/BACKEND.md         backend guide & API reference
```

## Run locally

```bash
npm install
npm run dev        # http://localhost:8080 (site + API, in-memory database with demo hotels)
npm test           # API test suite
```

Without `DATABASE_URL` the API uses an embedded PGlite database, so no setup is needed. It resets on restart. To use a real database, set `DATABASE_URL` and `JWT_SECRET` (see [docs/BACKEND.md](docs/BACKEND.md#5-configuration)).

On Vercel, `public/` is served as static files and `api/index.js` handles `/api/*` (see `vercel.json`). Add a Postgres database (e.g. Neon from the Vercel Marketplace) and the environment variables above to keep data across deployments.

## Notes

This is a demo. All airlines (Skylark Airways, Saffron Air, BlueKite…), hotels, bus operators, banks, payment apps, prices and availability are **fictional**, and no real payments are processed. Hotel bookings use a mock payment gateway and on-screen OTPs until an SMS provider and a payment gateway are connected (see "Before taking real money" in [docs/BACKEND.md](docs/BACKEND.md#8-before-taking-real-money)). Flights, trains and buses would need GDS/airline and rail integrations.
