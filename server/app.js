const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const { existsSync } = require("fs");
const connectDB = require("./mongodb/db");
const authRoutes = require("./mongodb/routes/auth.routes");
const artistsRoutes = require("./mongodb/routes/artists.routes");
const artworkRoutes = require("./mongodb/routes/artwork.routes");

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;
const clientDistPath = path.join(__dirname, "..", "art_client", "dist");
const clientIndexPath = path.join(clientDistPath, "index.html");
const hasBuiltClient = existsSync(clientIndexPath);

// Parse incoming JSON request bodies for POST/PUT APIs.
app.use(express.json());

// Serve the built frontend from Express when a production client build exists.
if (hasBuiltClient) {
  app.use(express.static(clientDistPath));
}

// Mount API resource routes under a shared /api prefix.
app.use("/api/auth", authRoutes);
app.use("/api/artists", artistsRoutes);
app.use("/api/artwork", artworkRoutes);

if (hasBuiltClient) {
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(clientIndexPath);
  });
} else {
  // Provide a simple root response so the server is easy to sanity-check in a browser.
  app.get("/", (req, res) => {
    res.send("Hello World from Express!");
  });
}

// Connect to MongoDB before opening the HTTP listener.
async function startServer() {
  await connectDB();

  app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
  });
}

startServer();
