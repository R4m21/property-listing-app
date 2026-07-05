const { Pool } = require("pg");

// Prefer a single DATABASE_URL (common on Supabase/Neon),
// fall back to discrete PG* env vars for local dev.
const useConnectionString = Boolean(process.env.DATABASE_URL);

const pool = new Pool(
  useConnectionString
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl:
          process.env.PGSSL === "true" ? { rejectUnauthorized: false } : false,
      }
    : {
        host: process.env.PGHOST || "localhost",
        port: Number(process.env.PGPORT) || 5432,
        user: process.env.PGUSER || "postgres",
        password: process.env.PGPASSWORD || "postgres",
        database: process.env.PGDATABASE || "property_listing",
        ssl:
          process.env.PGSSL === "true" ? { rejectUnauthorized: false } : false,
      },
);

pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client", err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
