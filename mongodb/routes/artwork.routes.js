const express = require("express");
const { getAllArtwork } = require("../controllers/artwork.controller");

const router = express.Router();

router.get("/", getAllArtwork);

module.exports = router;
