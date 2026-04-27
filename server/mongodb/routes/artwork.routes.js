const express = require("express");
const {
  getAllArtwork,
  getArtworkById,
  createArtwork,
  updateArtwork,
  deleteArtwork,
} = require("../controllers/artwork.controller");

const router = express.Router();


router.get("/", getAllArtwork);
router.get("/:id", getArtworkById);
router.post("/", createArtwork);
router.put("/:id", updateArtwork);

router.delete("/:id", deleteArtwork);

module.exports = router;
