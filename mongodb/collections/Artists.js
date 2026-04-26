const mongoose = require("mongoose");

const artistsSchema = new mongoose.Schema({
  ConstituentID: Number,
  DisplayName: String,
  ArtistBio: String,
  Nationality: String,
  Gender: String,
  BeginDate: Number,
  EndDate: Number,
  "Wiki QID": String,
  ULAN: String,
});

module.exports = mongoose.model("Artists", artistsSchema);
