const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const db = require("../db/pool");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
  );
}

function toPublicUser(row) {
  return { id: row.id, name: row.name, email: row.email, role: row.role };
}

// POST /api/auth/register
router.post(
  "/register",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("role")
      .isIn(["agent", "seeker"])
      .withMessage("Role must be 'agent' or 'seeker'"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { name, email, password, role } = req.body;
    const normalizedEmail = email.toLowerCase();

    try {
      const existing = await db.query("SELECT id FROM users WHERE email = $1", [
        normalizedEmail,
      ]);
      if (existing.rows.length > 0) {
        return res
          .status(409)
          .json({ message: "An account with this email already exists." });
      }

      const passwordHash = bcrypt.hashSync(password, 10);
      const { rows } = await db.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, email, role`,
        [name, normalizedEmail, passwordHash, role],
      );

      const user = rows[0];
      const token = signToken(user);
      res.status(201).json({ token, user: toPublicUser(user) });
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ message: "Registration failed. Please try again." });
    }
  },
);

// POST /api/auth/login
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase();

    try {
      const { rows } = await db.query("SELECT * FROM users WHERE email = $1", [
        normalizedEmail,
      ]);
      const user = rows[0];
      if (!user || !bcrypt.compareSync(password, user.password_hash)) {
        return res.status(401).json({ message: "Invalid email or password." });
      }

      const token = signToken(user);
      res.json({ token, user: toPublicUser(user) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Login failed. Please try again." });
    }
  },
);

// GET /api/auth/me
router.get("/me", authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
