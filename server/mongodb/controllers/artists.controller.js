const mongoose = require("mongoose");
const parseLimit = require("../../utils/parseLimit");

// Access the artists collection once the shared MongoDB connection is ready.
function getArtistsCollection() {
  if (!mongoose.connection.db) {
    throw new Error("Database connection is not ready.");
  }

  return mongoose.connection.db.collection("artists");
}

// Validate a route id param and convert it to ObjectId.
function parseObjectId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  return new mongoose.Types.ObjectId(id);
}

// Read all artists (limited) for listing views.
async function getAllArtists(req, res) {
  try {
    const artistsCollection = getArtistsCollection();
    const limit = parseLimit(req.query.limit);
    const artists = await artistsCollection.find({}).limit(limit).toArray();
    res.json(artists);
  } catch (error) {
    console.error("Failed to fetch artists:", error.message);
    res.status(500).json({ error: "Failed to fetch artists" });
  }
}

// Read one artist by _id.
async function getArtistById(req, res) {
  try {
    const artistsCollection = getArtistsCollection();
    const objectId = parseObjectId(req.params.id);
    if (!objectId) {
      return res.status(400).json({ error: "Invalid artist id" });
    }

    const artist = await artistsCollection.findOne({ _id: objectId });
    if (!artist) {
      return res.status(404).json({ error: "Artist not found" });
    }

    return res.json(artist);
  } catch (error) {
    console.error("Failed to fetch artist:", error.message);
    return res.status(500).json({ error: "Failed to fetch artist" });
  }
}

// Create a new artist document from request payload.
async function createArtist(req, res) {
  try {
    const artistsCollection = getArtistsCollection();
    const artistData = req.body;
    if (!artistData || Object.keys(artistData).length === 0) {
      return res.status(400).json({ error: "Artist payload is required" });
    }

    const result = await artistsCollection.insertOne(artistData);
    const createdArtist = await artistsCollection.findOne({
      _id: result.insertedId,
    });

    return res.status(201).json(createdArtist);
  } catch (error) {
    console.error("Failed to create artist:", error.message);
    return res.status(500).json({ error: "Failed to create artist" });
  }
}

// Update selected artist fields by _id.
async function updateArtist(req, res) {
  try {
    const artistsCollection = getArtistsCollection();
    const objectId = parseObjectId(req.params.id);
    if (!objectId) {
      return res.status(400).json({ error: "Invalid artist id" });
    }

    const { _id, ...updateData } = req.body || {};
    if (Object.keys(updateData).length === 0) {
      return res
        .status(400)
        .json({ error: "At least one field is required to update" });
    }

    const updateResult = await artistsCollection.updateOne(
      { _id: objectId },
      { $set: updateData }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ error: "Artist not found" });
    }

    const updatedArtist = await artistsCollection.findOne({ _id: objectId });
    return res.json(updatedArtist);
  } catch (error) {
    console.error("Failed to update artist:", error.message);
    return res.status(500).json({ error: "Failed to update artist" });
  }
}

// Delete one artist by _id.
async function deleteArtist(req, res) {
  try {
    const artistsCollection = getArtistsCollection();
    const objectId = parseObjectId(req.params.id);
    if (!objectId) {
      return res.status(400).json({ error: "Invalid artist id" });
    }

    const deleteResult = await artistsCollection.deleteOne({ _id: objectId });
    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({ error: "Artist not found" });
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Failed to delete artist:", error.message);
    return res.status(500).json({ error: "Failed to delete artist" });
  }
}

module.exports = {
  getAllArtists,
  getArtistById,
  createArtist,
  updateArtist,
  deleteArtist,
};
