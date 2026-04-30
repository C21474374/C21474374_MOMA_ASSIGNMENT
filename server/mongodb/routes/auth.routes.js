const express = require("express");
const {
  deleteCurrentUser,
  getCurrentUser,
  likeArtist,
  likeArtwork,
  login,
  register,
  unlikeArtist,
  unlikeArtwork,
  updateCurrentUser,
} = require("../controllers/auth.controller");
const { requireAuth } = require("../../middleware/auth.middleware");

const router = express.Router();

// Register a new user account.
router.post("/register", register);
// Log in and return a signed token for an existing user.
router.post("/login", login);
// Return the currently authenticated user.
router.get("/me", requireAuth, getCurrentUser);
// Update account fields for the current user and return a refreshed auth payload.
router.put("/me", requireAuth, updateCurrentUser);
// Delete the currently authenticated user account.
router.delete("/me", requireAuth, deleteCurrentUser);
// Add or remove liked artist ids on the current user's profile.
router.put("/me/likes/artists/:artistId", requireAuth, likeArtist);
router.delete("/me/likes/artists/:artistId", requireAuth, unlikeArtist);
// Add or remove liked artwork ids on the current user's profile.
router.put("/me/likes/artwork/:artworkId", requireAuth, likeArtwork);
router.delete("/me/likes/artwork/:artworkId", requireAuth, unlikeArtwork);

module.exports = router;
