const express = require("express");
const { body, validationResult } = require("express-validator");
const db = require("../db/pool");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

function toEnquiry(row) {
  return {
    id: row.id,
    propertyId: row.property_id,
    propertyTitle: row.property_title,
    agentId: row.agent_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
  };
}

// POST /api/enquiries - public: home seekers submit an enquiry for a property
router.post(
  "/",
  [
    body("propertyId").notEmpty().withMessage("propertyId is required"),
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("phone").trim().notEmpty().withMessage("Phone is required"),
    body("email")
      .optional({ checkFalsy: true })
      .isEmail()
      .withMessage("Email must be valid"),
    body("message").optional().isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { propertyId, name, email, phone, message } = req.body;

    try {
      const { rows: propRows } = await db.query(
        "SELECT id, agent_id, title FROM properties WHERE id = $1",
        [propertyId],
      );
      const property = propRows[0];
      if (!property)
        return res.status(404).json({ message: "Property not found." });

      const { rows } = await db.query(
        `INSERT INTO enquiries (property_id, agent_id, name, email, phone, message)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          propertyId,
          property.agent_id,
          name,
          email || "",
          phone,
          message || "",
        ],
      );

      res.status(201).json({
        enquiry: toEnquiry({ ...rows[0], property_title: property.title }),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Could not submit your enquiry." });
    }
  },
);

// GET /api/enquiries/mine - agent dashboard: all enquiries across all of the agent's properties
router.get("/mine", authenticate, requireRole("agent"), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT e.*, p.title AS property_title
       FROM enquiries e
       JOIN properties p ON p.id = e.property_id
       WHERE e.agent_id = $1
       ORDER BY e.created_at DESC`,
      [req.user.id],
    );
    res.json({ enquiries: rows.map(toEnquiry) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not fetch enquiries." });
  }
});

// GET /api/enquiries/property/:propertyId - agent, owner only
router.get(
  "/property/:propertyId",
  authenticate,
  requireRole("agent"),
  async (req, res) => {
    try {
      const { rows: propRows } = await db.query(
        "SELECT agent_id FROM properties WHERE id = $1",
        [req.params.propertyId],
      );
      const property = propRows[0];
      if (!property)
        return res.status(404).json({ message: "Property not found." });
      if (property.agent_id !== req.user.id) {
        return res.status(403).json({
          message: "You can only view enquiries for your own listings.",
        });
      }

      const { rows } = await db.query(
        `SELECT e.*, p.title AS property_title
       FROM enquiries e
       JOIN properties p ON p.id = e.property_id
       WHERE e.property_id = $1
       ORDER BY e.created_at DESC`,
        [req.params.propertyId],
      );
      res.json({ enquiries: rows.map(toEnquiry) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Could not fetch enquiries." });
    }
  },
);

// PATCH /api/enquiries/:id/status - agent, owner only
router.patch(
  "/:id/status",
  authenticate,
  requireRole("agent"),
  async (req, res) => {
    const { status } = req.body;
    if (!["new", "contacted", "closed"].includes(status)) {
      return res
        .status(400)
        .json({ message: "Status must be 'new', 'contacted', or 'closed'." });
    }

    try {
      const { rows: existingRows } = await db.query(
        "SELECT * FROM enquiries WHERE id = $1",
        [req.params.id],
      );
      const enquiry = existingRows[0];
      if (!enquiry)
        return res.status(404).json({ message: "Enquiry not found." });
      if (enquiry.agent_id !== req.user.id) {
        return res.status(403).json({
          message: "You can only manage enquiries for your own listings.",
        });
      }

      const { rows } = await db.query(
        `UPDATE enquiries SET status = $1 WHERE id = $2 RETURNING *`,
        [status, req.params.id],
      );
      const propResult = await db.query(
        "SELECT title FROM properties WHERE id = $1",
        [rows[0].property_id],
      );
      res.json({
        enquiry: toEnquiry({
          ...rows[0],
          property_title: propResult.rows[0].title,
        }),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Could not update enquiry status." });
    }
  },
);

module.exports = router;
