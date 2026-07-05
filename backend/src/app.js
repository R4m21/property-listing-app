const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const propertyRoutes = require("./routes/properties");
const enquiryRoutes = require("./routes/enquiries");
const uploadRoutes = require("./routes/uploads");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Property Listing API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/enquiries", enquiryRoutes);
app.use("/api/uploads", uploadRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Multer / upload-specific errors
app.use((err, req, res, next) => {
  if (err && err.name === "MulterError") {
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  }
  next(err);
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

module.exports = app;
