const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./mongodb/db");
const artistsRoutes = require("./mongodb/routes/artists.routes");
const artworkRoutes = require("./mongodb/routes/artwork.routes");

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.send("Hello World from Express!");
});

app.use("/api/artists", artistsRoutes);
app.use("/api/artwork", artworkRoutes);


async function startServer() {
  await connectDB();

  app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
  });
}

startServer();
