const mongoose = require("mongoose");

// Access the users collection once the shared MongoDB connection is ready.
function getUsersCollection() {
  if (!mongoose.connection.db) {
    throw new Error("Database connection is not ready.");
  }

  return mongoose.connection.db.collection("users");
}

// Create supporting indexes for account lookups and uniqueness rules.
async function ensureUsersIndexes() {
  const usersCollection = getUsersCollection();

  await usersCollection.createIndex(
    { email: 1 },
    { unique: true, name: "users_email_unique" }
  );
}

// Normalize emails so comparisons and uniqueness checks are consistent.
function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

// Perform a lightweight email format check before saving or querying accounts.
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Strip password hashes and normalize liked-id arrays before returning user data.
function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  const { passwordHash, ...safeUser } = user;

  return {
    ...safeUser,
    likedArtistIds: Array.isArray(safeUser.likedArtistIds)
      ? safeUser.likedArtistIds
      : [],
    likedArtworkIds: Array.isArray(safeUser.likedArtworkIds)
      ? safeUser.likedArtworkIds
      : [],
  };
}

module.exports = {
  ensureUsersIndexes,
  getUsersCollection,
  isValidEmail,
  normalizeEmail,
  sanitizeUser,
};
