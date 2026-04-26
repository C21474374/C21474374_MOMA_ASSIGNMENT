const mongoose = require("mongoose");
const parseLimit = require("../../utils/parseLimit");

async function getAllArtwork(req, res) {
  try {
    if (!mongoose.connection.db) {
      throw new Error("Database connection is not ready.");
    }

    const limit = parseLimit(req.query.limit);
    const artwork = await mongoose.connection.db
      .collection("artwork")
      .find({})
      .limit(limit)
      .toArray();
    res.json(artwork);
  } catch (error) {
    console.error("Failed to fetch artwork:", error.message);
    res.status(500).json({ error: "Failed to fetch artwork" });
  }
}

module.exports = {
  getAllArtwork,
};
