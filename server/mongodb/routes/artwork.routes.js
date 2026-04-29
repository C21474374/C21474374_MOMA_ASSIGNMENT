const express = require("express");
const {
  getAllArtwork,
  getArtworkById,
  createArtwork,
  updateArtwork,
  deleteArtwork,
} = require("../controllers/artwork.controller");

const router = express.Router();

// List artwork for collection browsing.
router.get("/", getAllArtwork);
// Fetch one artwork document by MongoDB _id.
router.get("/:id", getArtworkById);
// Create a new artwork document.
router.post("/", createArtwork);
// Update selected artwork fields by MongoDB _id.
router.put("/:id", updateArtwork);
// Delete one artwork document by MongoDB _id.
router.delete("/:id", deleteArtwork);

module.exports = router;
