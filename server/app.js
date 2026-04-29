const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./mongodb/db");
const authRoutes = require("./mongodb/routes/auth.routes");
const artistsRoutes = require("./mongodb/routes/artists.routes");
const artworkRoutes = require("./mongodb/routes/artwork.routes");

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

// Parse incoming JSON request bodies for POST/PUT APIs.
app.use(express.json());

// Provide a simple root response so the server is easy to sanity-check in a browser.
app.get("/", (req, res) => {
  res.send("Hello World from Express!");
});

// Mount API resource routes under a shared /api prefix.
app.use("/api/auth", authRoutes);
app.use("/api/artists", artistsRoutes);
app.use("/api/artwork", artworkRoutes);

// Connect to MongoDB before opening the HTTP listener.
async function startServer() {
  await connectDB();

  app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
  });
}

startServer();
