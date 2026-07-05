-- Requires pgcrypto for gen_random_uuid(); available by default on most managed
-- Postgres providers (Render, Railway, Supabase, Neon). We create it defensively.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  role           TEXT NOT NULL CHECK (role IN ('agent', 'seeker')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
