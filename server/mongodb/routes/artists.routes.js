const express = require("express");
const {
  getAllArtists,
  getArtistById,
  createArtist,
  updateArtist,
  deleteArtist,
} = require("../controllers/artists.controller");

const router = express.Router();


router.get("/", getAllArtists);
router.get("/:id", getArtistById);
router.post("/", createArtist);
router.put("/:id", updateArtist);
router.delete("/:id", deleteArtist);

module.exports = router;
