require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { pool } = require("./pool");

async function initializeDatabase() {
  const schema = fs.readFileSync(path.join(__dirname, "setup.sql"), "utf8");
  try {
    console.log("Initializing database setup...");
    await pool.query(schema);
    console.log("Database tables setup successfully!");
  } catch (err) {
    console.error("Database initialization failed:", err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

initializeDatabase();
