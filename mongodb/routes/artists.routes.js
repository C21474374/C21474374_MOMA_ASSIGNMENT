const express = require("express");
const { getAllArtists } = require("../controllers/artists.controller");

const router = express.Router();

router.get("/", getAllArtists);

module.exports = router;
