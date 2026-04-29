const express = require("express");
const {
  getAllArtists,
  getArtistById,
  createArtist,
  updateArtist,
  deleteArtist,
} = require("../controllers/artists.controller");

const router = express.Router();

// List artists for collection browsing.
router.get("/", getAllArtists);
// Fetch one artist document by MongoDB _id.
router.get("/:id", getArtistById);
// Create a new artist document.
router.post("/", createArtist);
// Update selected artist fields by MongoDB _id.
router.put("/:id", updateArtist);
// Delete one artist document by MongoDB _id.
router.delete("/:id", deleteArtist);

module.exports = router;
