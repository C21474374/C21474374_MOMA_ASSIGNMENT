const mongoose = require("mongoose");

const artworkSchema = new mongoose.Schema({
  Title: String,
  Artist: [String],
  ConstituentID: [Number],
  ArtistBio: [String],
  Nationality: [String],
  BeginDate: [Number],
  EndDate: [Number],
  Gender: [String],
  Date: String,
  Medium: String,
  Dimensions: String,
  CreditLine: String,
  AccessionNumber: String,
  Classification: String,
  Department: String,
  DateAcquired: String,
  Cataloged: String,
  ObjectID: Number,
  URL: String,
  ImageURL: String,
  OnView: String,
  "Height (cm)": Number,
  "Width (cm)": Number,
});

module.exports = mongoose.model("Artwork", artworkSchema);
