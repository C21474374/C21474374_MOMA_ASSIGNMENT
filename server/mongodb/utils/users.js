const mongoose = require("mongoose");

function getUsersCollection() {
  if (!mongoose.connection.db) {
    throw new Error("Database connection is not ready.");
  }

  return mongoose.connection.db.collection("users");
}

async function ensureUsersIndexes() {
  const usersCollection = getUsersCollection();

  await usersCollection.createIndex(
    { email: 1 },
    { unique: true, name: "users_email_unique" }
  );
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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
