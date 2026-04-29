const mongoose = require("mongoose");
const parseLimit = require("../../utils/parseLimit");

// Access the artwork collection once the shared MongoDB connection is ready.
function getArtworkCollection() {
  if (!mongoose.connection.db) {
    throw new Error("Database connection is not ready.");
  }

  return mongoose.connection.db.collection("artwork");
}

// Validate a route id param and convert it to ObjectId.
function parseObjectId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  return new mongoose.Types.ObjectId(id);
}

// Read artwork list (limited) for gallery/list views.
async function getAllArtwork(req, res) {
  try {
    const artworkCollection = getArtworkCollection();
    const limit = parseLimit(req.query.limit);
    const artwork = await artworkCollection.find({}).limit(limit).toArray();
    res.json(artwork);
  } catch (error) {
    console.error("Failed to fetch artwork:", error.message);
    res.status(500).json({ error: "Failed to fetch artwork" });
  }
}

// Read one artwork item by _id.
async function getArtworkById(req, res) {
  try {
    const artworkCollection = getArtworkCollection();
    const objectId = parseObjectId(req.params.id);
    if (!objectId) {
      return res.status(400).json({ error: "Invalid artwork id" });
    }

    const artworkItem = await artworkCollection.findOne({ _id: objectId });
    if (!artworkItem) {
      return res.status(404).json({ error: "Artwork not found" });
    }

    return res.json(artworkItem);
  } catch (error) {
    console.error("Failed to fetch artwork item:", error.message);
    return res.status(500).json({ error: "Failed to fetch artwork item" });
  }
}

// Create a new artwork document from request payload.
async function createArtwork(req, res) {
  try {
    const artworkCollection = getArtworkCollection();
    const artworkData = req.body;
    if (!artworkData || Object.keys(artworkData).length === 0) {
      return res.status(400).json({ error: "Artwork payload is required" });
    }

    const result = await artworkCollection.insertOne(artworkData);
    const createdArtwork = await artworkCollection.findOne({
      _id: result.insertedId,
    });

    return res.status(201).json(createdArtwork);
  } catch (error) {
    console.error("Failed to create artwork:", error.message);
    return res.status(500).json({ error: "Failed to create artwork" });
  }
}

// Update selected artwork fields by _id.
async function updateArtwork(req, res) {
  try {
    const artworkCollection = getArtworkCollection();
    const objectId = parseObjectId(req.params.id);
    if (!objectId) {
      return res.status(400).json({ error: "Invalid artwork id" });
    }

    const { _id, ...updateData } = req.body || {};
    if (Object.keys(updateData).length === 0) {
      return res
        .status(400)
        .json({ error: "At least one field is required to update" });
    }

    const updateResult = await artworkCollection.updateOne(
      { _id: objectId },
      { $set: updateData }
    );
    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ error: "Artwork not found" });
    }

    const updatedArtwork = await artworkCollection.findOne({ _id: objectId });
    return res.json(updatedArtwork);
  } catch (error) {
    console.error("Failed to update artwork:", error.message);
    return res.status(500).json({ error: "Failed to update artwork" });
  }
}

// Delete one artwork item by _id.
async function deleteArtwork(req, res) {
  try {
    const artworkCollection = getArtworkCollection();
    const objectId = parseObjectId(req.params.id);
    if (!objectId) {
      return res.status(400).json({ error: "Invalid artwork id" });
    }

    const deleteResult = await artworkCollection.deleteOne({ _id: objectId });
    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({ error: "Artwork not found" });
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Failed to delete artwork:", error.message);
    return res.status(500).json({ error: "Failed to delete artwork" });
  }
}

module.exports = {
  getAllArtwork,
  getArtworkById,
  createArtwork,
  updateArtwork,
  deleteArtwork,
};
