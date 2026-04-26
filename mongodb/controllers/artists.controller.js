const mongoose = require("mongoose");
const parseLimit = require("../../utils/parseLimit");

async function getAllArtists(req, res) {
  try {
    if (!mongoose.connection.db) {
      throw new Error("Database connection is not ready.");
    }

    const limit = parseLimit(req.query.limit);
    const artists = await mongoose.connection.db
      .collection("artists")
      .find({})
      .limit(limit)
      .toArray();
    res.json(artists);
  } catch (error) {
    console.error("Failed to fetch artists:", error.message);
    res.status(500).json({ error: "Failed to fetch artists" });
  }
}

module.exports = {
  getAllArtists,
};
