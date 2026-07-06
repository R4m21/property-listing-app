require("dotenv").config();
const bcrypt = require("bcryptjs");
const { pool } = require("./db/pool");

async function seed() {
  const client = await pool.connect();
  try {
    console.log("Clearing existing data…");
    await client.query(
      "TRUNCATE enquiries, properties, users RESTART IDENTITY CASCADE",
    );

    const passwordHash = bcrypt.hashSync("Test@1234", 10);

    const {
      rows: [agent],
    } = await client.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'agent') RETURNING id`,
      ["Rohan Sharma", "agent@example.com", passwordHash],
    );

    await client.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'seeker')`,
      ["Priya Verma", "seeker@example.com", passwordHash],
    );

    const properties = [
      {
        title: "Sunny 2BHK near Powai Lake",
        description:
          "Bright, well-ventilated apartment close to Powai Lake with modern amenities.",
        location: "Powai, Mumbai",
        bhk: 2,
        price: 8500000,
        type: "sale",
        area: 950,
      },
      {
        title: "Spacious 3BHK in Kalyan West",
        description:
          "Family-friendly society with garden, gym, and 24x7 security.",
        location: "Kalyan West, Thane",
        bhk: 3,
        price: 32000,
        type: "rent",
        area: 1200,
      },
      {
        title: "Cozy 1BHK in Dombivli",
        description:
          "Perfect starter home, walking distance from the railway station.",
        location: "Dombivli, Thane",
        bhk: 1,
        price: 4200000,
        type: "sale",
        area: 550,
      },
    ];

    for (const p of properties) {
      await client.query(
        `INSERT INTO properties (agent_id, title, description, location, bhk, price, type, area, images)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, '[]'::jsonb)`,
        [
          agent.id,
          p.title,
          p.description,
          p.location,
          p.bhk,
          p.price,
          p.type,
          p.area,
        ],
      );
    }

    console.log("Seed complete!");
    console.log("Agent login  -> email: agent@test.com  | password: Test@1234");
    console.log("Seeker login -> email: seeker@test.com | password: Test@1234");
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
