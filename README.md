# TripSaathi – *Har safar ka saathi*

<p align="center"><img src="assets/img/logo-dark.svg" alt="TripSaathi logo" width="320"></p>

**TripSaathi** is a full-featured online travel agency (OTA) front-end modelled on the layout and booking flows of large Indian travel portals such as MakeMyTrip. It uses its **own brand, logo, copy and artwork**. None of MakeMyTrip's trademarks, images or text are used.

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
| `hotels.html` | Filters for price bands, stars, user rating, property type, amenities and locality, plus name search; sort options; shortlist (heart); member pricing |
| `hotel.html` | Photo gallery, sticky section nav, room types with Room Only / Breakfast plans, amenities, location, ratings breakdown and reviews, property rules |
| `holidays.html` | Theme tabs, duration / budget / region / hotel-star filters, day-wise itinerary modal |
| `trains.html` | Class-wise fares with availability (AVAILABLE / RAC / WL / REGRET), Tatkal tags, running days, schedule modal; PNR status and live train status from the home page |
| `buses.html` | Operator, type, time and rating filters; interactive seat map (sleeper decks or 2+2 seater); boarding and dropping points |
| `cabs.html` | Outstation one-way and round trip, airport transfers and hourly rentals; car categories with inclusions |

**Checkout** (`review.html`)
- Itinerary review, traveller forms (age for train/bus, passport for international flights), contact details and add-ons (insurance, zero cancellation)
- Coupon engine with validity and minimum-amount rules, TripCoins redemption, and a 15-minute session timer
- Payment modal (UPI, card, net banking, pay later) with validation, a processing state, and a confirmation page with booking ID

**Account**
- `mytrips.html`: Upcoming / Cancelled / Completed tabs, details, e-ticket, and cancellation with a refund estimate
- `offers.html`: all offers by category plus a coupon-code table

Every page is responsive down to 360px: on phones the filters slide in as a drawer, pickers open as bottom sheets and the search bar collapses.

## How it works

It's a dependency-free static site (plain HTML, CSS and vanilla JS). There's no build step and no backend.

- **Data**: `assets/js/data.js` holds airports, stations, cities, packages, offers and coupons. Flights, hotels, trains and buses are generated deterministically from a seeded RNG, so the same search always shows the same results.
- **Artwork**: every image is a procedurally generated SVG scene (beaches, mountains, cities, palaces, backwaters, rooms, pools…) drawn in `TS.scene()`, so there are no external or copyrighted images.
- **State**: login, bookings, shortlist and TripCoins are kept in `localStorage`. The current checkout is kept in `sessionStorage`.

```
index.html  flights.html  hotels.html  hotel.html  holidays.html
trains.html buses.html    cabs.html    review.html mytrips.html  offers.html
assets/
  css/style.css        – design system & all page styles
  js/data.js           – static data
  js/common.js         – utils, icons, logo, SVG scenes, popovers, date/list pickers,
                         header/footer, login, bookings, data generators
  js/search.js         – search widgets for all 10 products (home + results pages)
  js/<page>.js         – page logic
  img/                 – logo & favicon SVGs
```

## Run locally

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

Any static host works too (GitHub Pages, Netlify, Vercel): just serve the repository root.

## Notes

This is a demo front-end. All airlines (Skylark Airways, Saffron Air, BlueKite…), hotels, bus operators, banks, payment apps, prices and availability are **fictional**, and no real payments are processed. Real bookings would need a backend with GDS/airline, hotel-supplier, rail and payment-gateway integrations.
