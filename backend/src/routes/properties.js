const express = require("express");
const { body, validationResult } = require("express-validator");
const db = require("../db/pool");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

function toProperty(row) {
  return {
    id: row.id,
    agentId: row.agent_id,
    agentName: row.agent_name,
    title: row.title,
    description: row.description,
    location: row.location,
    bhk: row.bhk,
    price: Number(row.price),
    type: row.type,
    area: row.area !== null ? Number(row.area) : null,
    images: row.images || [],
    views: row.views,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_WITH_AGENT = `
  SELECT p.*, u.name AS agent_name
  FROM properties p
  JOIN users u ON u.id = p.agent_id
`;

// GET /api/properties?location=&bhk=&minPrice=&maxPrice=&type=&page=&limit=
// Public - search + filter + pagination
router.get("/", async (req, res) => {
  const {
    location,
    bhk,
    minPrice,
    maxPrice,
    type,
    page = 1,
    limit = 9,
  } = req.query;

  const conditions = [];
  const params = [];

  if (location) {
    params.push(`%${location}%`);
    conditions.push(`p.location ILIKE $${params.length}`);
  }
  if (bhk) {
    params.push(Number(bhk));
    conditions.push(`p.bhk = $${params.length}`);
  }
  if (type) {
    params.push(type);
    conditions.push(`p.type = $${params.length}`);
  }
  if (minPrice) {
    params.push(Number(minPrice));
    conditions.push(`p.price >= $${params.length}`);
  }
  if (maxPrice) {
    params.push(Number(maxPrice));
    conditions.push(`p.price <= $${params.length}`);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.max(1, Number(limit));
  const offset = (pageNum - 1) * limitNum;

  try {
    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total FROM properties p ${whereClause}`,
      params,
    );
    const total = countResult.rows[0].total;

    const dataParams = [...params, limitNum, offset];
    const { rows } = await db.query(
      `${SELECT_WITH_AGENT} ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams,
    );

    res.json({
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
      properties: rows.map(toProperty),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not fetch properties." });
  }
});

// GET /api/properties/mine - agent's own listings
router.get("/mine", authenticate, requireRole("agent"), async (req, res) => {
  try {
    const { rows } = await db.query(
      `${SELECT_WITH_AGENT} WHERE p.agent_id = $1 ORDER BY p.created_at DESC`,
      [req.user.id],
    );
    res.json({ properties: rows.map(toProperty) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not fetch your listings." });
  }
});

// GET /api/properties/:id - public single listing
router.get("/:id", async (req, res) => {
  try {
    const { rows } = await db.query(`${SELECT_WITH_AGENT} WHERE p.id = $1`, [
      req.params.id,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ message: "Property not found." });

    // increment view count (analytics)
    await db.query("UPDATE properties SET views = views + 1 WHERE id = $1", [
      req.params.id,
    ]);
    rows[0].views += 1;

    res.json({ property: toProperty(rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not fetch this property." });
  }
});

// POST /api/properties - agent only
router.post(
  "/",
  authenticate,
  requireRole("agent"),
  [
    body("title").trim().notEmpty().withMessage("Title is required"),
    body("location").trim().notEmpty().withMessage("Location is required"),
    body("bhk").isInt({ min: 1 }).withMessage("BHK must be a positive number"),
    body("price")
      .isFloat({ min: 0 })
      .withMessage("Price must be a positive number"),
    body("type")
      .isIn(["sale", "rent"])
      .withMessage("Type must be 'sale' or 'rent'"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { title, description, location, bhk, price, type, area, images } =
      req.body;

    try {
      const { rows } = await db.query(
        `INSERT INTO properties (agent_id, title, description, location, bhk, price, type, area, images)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          req.user.id,
          title,
          description || "",
          location,
          Number(bhk),
          Number(price),
          type,
          area || null,
          JSON.stringify(Array.isArray(images) ? images : []),
        ],
      );

      const property = toProperty({ ...rows[0], agent_name: req.user.name });
      res.status(201).json({ property });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Could not create this listing." });
    }
  },
);

// PATCH /api/properties/:id - agent, owner only
router.patch("/:id", authenticate, requireRole("agent"), async (req, res) => {
  try {
    const { rows: existingRows } = await db.query(
      "SELECT * FROM properties WHERE id = $1",
      [req.params.id],
    );
    const property = existingRows[0];
    if (!property)
      return res.status(404).json({ message: "Property not found." });
    if (property.agent_id !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You can only edit your own listings." });
    }

    const fieldMap = {
      title: "title",
      description: "description",
      location: "location",
      bhk: "bhk",
      price: "price",
      type: "type",
      area: "area",
      images: "images",
    };

    const setClauses = [];
    const params = [];

    for (const [key, column] of Object.entries(fieldMap)) {
      if (req.body[key] === undefined) continue;
      let value = req.body[key];
      if (key === "bhk") value = Number(value);
      if (key === "price") value = Number(value);
      if (key === "images")
        value = JSON.stringify(Array.isArray(value) ? value : []);
      params.push(value);
      setClauses.push(`${column} = $${params.length}`);
    }

    setClauses.push(`updated_at = now()`);
    params.push(req.params.id);

    const { rows } = await db.query(
      `UPDATE properties SET ${setClauses.join(", ")} WHERE id = $${params.length} RETURNING *`,
      params,
    );

    const agentResult = await db.query("SELECT name FROM users WHERE id = $1", [
      rows[0].agent_id,
    ]);
    res.json({
      property: toProperty({
        ...rows[0],
        agent_name: agentResult.rows[0].name,
      }),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not update this listing." });
  }
});

// DELETE /api/properties/:id - agent, owner only
router.delete("/:id", authenticate, requireRole("agent"), async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM properties WHERE id = $1", [
      req.params.id,
    ]);
    const property = rows[0];
    if (!property)
      return res.status(404).json({ message: "Property not found." });
    if (property.agent_id !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You can only delete your own listings." });
    }

    // ON DELETE CASCADE on enquiries.property_id handles cleanup of related enquiries
    await db.query("DELETE FROM properties WHERE id = $1", [req.params.id]);
    res.json({ message: "Property deleted successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not delete this listing." });
  }
});

module.exports = router;
