const express = require("express");
const {
  getCurrentUser,
  login,
  register,
} = require("../controllers/auth.controller");
const { requireAuth } = require("../../middleware/auth.middleware");

const router = express.Router();

// Register a new user account.
router.post("/register", register);
// Log in and return a signed token for an existing user.
router.post("/login", login);
// Return the currently authenticated user.
router.get("/me", requireAuth, getCurrentUser);

module.exports = router;
