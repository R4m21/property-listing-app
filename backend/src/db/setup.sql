-- Requires pgcrypto for gen_random_uuid(); available by default on most managed
-- Postgres providers (Supabase, Neon). We create it defensively.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  role           TEXT NOT NULL CHECK (role IN ('agent', 'seeker')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS properties (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT DEFAULT '',
  location     TEXT NOT NULL,
  bhk          INTEGER NOT NULL CHECK (bhk > 0),
  price        NUMERIC(14, 2) NOT NULL CHECK (price >= 0),
  type         TEXT NOT NULL CHECK (type IN ('sale', 'rent')),
  area         NUMERIC(10, 2),
  images       JSONB NOT NULL DEFAULT '[]'::jsonb,
  views        INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_properties_agent_id ON properties(agent_id);
CREATE INDEX IF NOT EXISTS idx_properties_location ON properties USING gin (to_tsvector('simple', location));
CREATE INDEX IF NOT EXISTS idx_properties_bhk ON properties(bhk);
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);

CREATE TABLE IF NOT EXISTS enquiries (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id    UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  agent_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  email          TEXT DEFAULT '',
  phone          TEXT NOT NULL,
  message        TEXT DEFAULT '',
  status         TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enquiries_agent_id ON enquiries(agent_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_property_id ON enquiries(property_id);
