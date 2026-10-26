/* Ordered, append-only schema migrations. Never edit a migration that has shipped – add a new one. */

export const migrations = [
  {
    id: '001_hotels_core',
    sql: `
CREATE TABLE users (
  id            text PRIMARY KEY,
  role          text NOT NULL CHECK (role IN ('customer', 'partner', 'admin')),
  name          text NOT NULL DEFAULT '',
  email         text,
  phone         text,
  password_hash text,
  failed_logins int NOT NULL DEFAULT 0,
  locked_until  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);
-- Customers sign in with their mobile number; partners and admins with email + password.
CREATE UNIQUE INDEX users_customer_phone ON users (phone) WHERE role = 'customer';
CREATE UNIQUE INDEX users_staff_email ON users (lower(email)) WHERE role IN ('partner', 'admin');

CREATE TABLE otp_codes (
  id          text PRIMARY KEY,
  phone       text NOT NULL,
  code_hash   text NOT NULL,
  expires_at  timestamptz NOT NULL,
  attempts    int NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX otp_codes_phone ON otp_codes (phone, created_at DESC);

CREATE TABLE properties (
  id             text PRIMARY KEY,
  owner_id       text NOT NULL REFERENCES users (id),
  status         text NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft', 'pending_review', 'live', 'rejected', 'suspended')),
  name           text NOT NULL,
  category       text NOT NULL DEFAULT 'hotel' CHECK (category IN ('hotel', 'homestay')),
  property_type  text NOT NULL DEFAULT 'Hotel',
  star_rating    int NOT NULL DEFAULT 0 CHECK (star_rating BETWEEN 0 AND 5),
  description    text NOT NULL DEFAULT '',
  address        text NOT NULL DEFAULT '',
  locality       text NOT NULL DEFAULT '',
  city           text NOT NULL DEFAULT '',
  state          text NOT NULL DEFAULT '',
  country        text NOT NULL DEFAULT 'India',
  pincode        text NOT NULL DEFAULT '',
  landmark       text NOT NULL DEFAULT '',
  latitude       double precision,
  longitude      double precision,
  scene          text NOT NULL DEFAULT 'city',
  check_in_time  text NOT NULL DEFAULT '14:00',
  check_out_time text NOT NULL DEFAULT '12:00',
  amenities      jsonb NOT NULL DEFAULT '[]',
  photos         jsonb NOT NULL DEFAULT '[]',
  policies       jsonb NOT NULL DEFAULT '{}',
  contact        jsonb NOT NULL DEFAULT '{}',
  legal          jsonb NOT NULL DEFAULT '{}',
  commission_pct int NOT NULL DEFAULT 15 CHECK (commission_pct BETWEEN 0 AND 50),
  rating_avg     real NOT NULL DEFAULT 0,
  rating_count   int NOT NULL DEFAULT 0,
  review_note    text,
  submitted_at   timestamptz,
  approved_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX properties_live_city ON properties (lower(city), category) WHERE status = 'live';
CREATE INDEX properties_owner ON properties (owner_id);
CREATE INDEX properties_status ON properties (status, submitted_at);

CREATE TABLE property_events (
  id          text PRIMARY KEY,
  property_id text NOT NULL REFERENCES properties (id) ON DELETE CASCADE,
  actor_id    text REFERENCES users (id),
  action      text NOT NULL,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX property_events_property ON property_events (property_id, created_at);

CREATE TABLE room_types (
  id                text PRIMARY KEY,
  property_id       text NOT NULL REFERENCES properties (id) ON DELETE CASCADE,
  name              text NOT NULL,
  description       text NOT NULL DEFAULT '',
  bed_type          text NOT NULL DEFAULT '',
  view              text NOT NULL DEFAULT '',
  size_sqft         int,
  base_occupancy    int NOT NULL DEFAULT 2 CHECK (base_occupancy >= 1),
  max_adults        int NOT NULL DEFAULT 2 CHECK (max_adults >= 1),
  max_children      int NOT NULL DEFAULT 1 CHECK (max_children >= 0),
  max_occupancy     int NOT NULL DEFAULT 3 CHECK (max_occupancy >= 1),
  extra_adult_price int NOT NULL DEFAULT 0 CHECK (extra_adult_price >= 0),
  total_rooms       int NOT NULL CHECK (total_rooms BETWEEN 1 AND 1000),
  base_price        int NOT NULL CHECK (base_price > 0),
  weekend_price     int CHECK (weekend_price IS NULL OR weekend_price > 0),
  amenities         jsonb NOT NULL DEFAULT '[]',
  photos            jsonb NOT NULL DEFAULT '[]',
  active            boolean NOT NULL DEFAULT true,
  sort              int NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX room_types_property ON room_types (property_id);

-- Meal / refund options sold on top of a room type, priced as a delta per room per night.
CREATE TABLE rate_plans (
  id           text PRIMARY KEY,
  room_type_id text NOT NULL REFERENCES room_types (id) ON DELETE CASCADE,
  name         text NOT NULL,
  meal_plan    text NOT NULL DEFAULT 'EP' CHECK (meal_plan IN ('EP', 'CP', 'MAP', 'AP')),
  price_delta  int NOT NULL DEFAULT 0,
  refundable   boolean NOT NULL DEFAULT true,
  active       boolean NOT NULL DEFAULT true,
  sort         int NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX rate_plans_room ON rate_plans (room_type_id);

-- One row per room type per night, created on demand. total NULL = use room_types.total_rooms;
-- price NULL = use the room type's base/weekend price. sold counts held + confirmed rooms.
CREATE TABLE inventory (
  room_type_id text NOT NULL REFERENCES room_types (id) ON DELETE CASCADE,
  date         date NOT NULL,
  total        int CHECK (total IS NULL OR total >= 0),
  sold         int NOT NULL DEFAULT 0 CHECK (sold >= 0),
  price        int CHECK (price IS NULL OR price > 0),
  stop_sell    boolean NOT NULL DEFAULT false,
  PRIMARY KEY (room_type_id, date)
);

CREATE TABLE bookings (
  id                  text PRIMARY KEY,
  user_id             text NOT NULL REFERENCES users (id),
  property_id         text NOT NULL REFERENCES properties (id),
  room_type_id        text NOT NULL REFERENCES room_types (id),
  rate_plan_id        text NOT NULL REFERENCES rate_plans (id),
  check_in            date NOT NULL,
  check_out           date NOT NULL CHECK (check_out > check_in),
  nights              int NOT NULL,
  rooms               int NOT NULL CHECK (rooms >= 1),
  adults              int NOT NULL CHECK (adults >= 1),
  children            int NOT NULL DEFAULT 0,
  guest               jsonb NOT NULL,
  special_requests    text NOT NULL DEFAULT '',
  pricing             jsonb NOT NULL,
  room_charges        int NOT NULL,
  taxes               int NOT NULL,
  discount            int NOT NULL DEFAULT 0,
  total_amount        int NOT NULL,
  coupon_code         text,
  commission_pct      int NOT NULL,
  commission_amount   int NOT NULL,
  payout_amount       int NOT NULL,
  status              text NOT NULL CHECK (status IN ('held', 'confirmed', 'cancelled', 'expired')),
  hold_expires_at     timestamptz,
  cancellation_policy text NOT NULL,
  refund_amount       int,
  cancelled_at        timestamptz,
  cancelled_by        text,
  cancel_reason       text,
  confirmed_at        timestamptz,
  snapshot            jsonb NOT NULL DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bookings_user ON bookings (user_id, created_at DESC);
CREATE INDEX bookings_property ON bookings (property_id, check_in);
CREATE INDEX bookings_holds ON bookings (hold_expires_at) WHERE status = 'held';

CREATE TABLE payments (
  id           text PRIMARY KEY,
  booking_id   text NOT NULL REFERENCES bookings (id),
  kind         text NOT NULL CHECK (kind IN ('charge', 'refund')),
  provider     text NOT NULL,
  method       text NOT NULL,
  amount       int NOT NULL,
  status       text NOT NULL CHECK (status IN ('succeeded', 'failed')),
  provider_ref text,
  details      jsonb NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payments_booking ON payments (booking_id);

CREATE TABLE reviews (
  id          text PRIMARY KEY,
  property_id text NOT NULL REFERENCES properties (id) ON DELETE CASCADE,
  booking_id  text UNIQUE REFERENCES bookings (id),
  user_id     text REFERENCES users (id),
  author_name text NOT NULL,
  rating      int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     text NOT NULL DEFAULT '',
  stayed_on   date,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reviews_property ON reviews (property_id, created_at DESC);
`,
  },
];
