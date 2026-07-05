const express = require("express");
const streamifier = require("streamifier");
const cloudinary = require("../config/cloudinary");
const upload = require("../middleware/upload");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

function uploadBufferToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "property-listing-app", resource_type: "image" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
}

// POST /api/uploads/images - agent only, up to 6 images per request
// multipart/form-data, field name: "images"
router.post(
  "/images",
  authenticate,
  requireRole("agent"),
  upload.array("images", 6),
  async (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No image files were provided." });
    }

    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      return res.status(500).json({
        message:
          "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in backend/.env.",
      });
    }

    try {
      const results = await Promise.all(
        req.files.map((file) => uploadBufferToCloudinary(file.buffer)),
      );
      const images = results.map((r) => ({
        url: r.secure_url,
        publicId: r.public_id,
      }));
      res.status(201).json({ images });
    } catch (err) {
      console.error("Cloudinary upload failed:", err.message);
      res
        .status(502)
        .json({ message: "Image upload failed. Please try again." });
    }
  },
);

// DELETE /api/uploads/images/:publicId - agent only, removes an image from Cloudinary
// publicId may contain slashes (folder path), so it's passed as a query param instead of a route param
router.delete(
  "/images",
  authenticate,
  requireRole("agent"),
  async (req, res) => {
    const { publicId } = req.query;
    if (!publicId)
      return res.status(400).json({ message: "publicId is required." });

    try {
      await cloudinary.uploader.destroy(publicId);
      res.json({ message: "Image deleted." });
    } catch (err) {
      console.error("Cloudinary delete failed:", err.message);
      res.status(502).json({ message: "Could not delete image." });
    }
  },
);

module.exports = router;
