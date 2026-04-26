const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./mongodb/db");
const Artist = require("./mongodb/collections/Artists");
const Artwork = require("./mongodb/collections/Artwork");

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

// Define a route for GET requests to the root URL
app.get("/", (req, res) => {
  res.send("Hello World from Express!");
});

function parseLimit(limitValue, defaultLimit = 50, maxLimit = 200) {
  const parsed = Number.parseInt(limitValue, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return defaultLimit;
  }

  return Math.min(parsed, maxLimit);
}

// Get all artists route
app.get("/artists", async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit);
    const artists = await Artist.find().limit(limit);
    res.json(artists);
  } catch (error) {
    console.error("Failed to fetch artists:", error.message);
    res.status(500).json({ error: "Failed to fetch artists" });
  }
});

// Get all artwork route
app.get("/artwork", async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit);
    const artwork = await Artwork.find().limit(limit);
    res.json(artwork);
  } catch (error) {
    console.error("Failed to fetch artwork:", error.message);
    res.status(500).json({ error: "Failed to fetch artwork" });
  }
});


// Start the server after connecting to the database
async function startServer() {
  await connectDB();

  app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
  });
}

startServer();
