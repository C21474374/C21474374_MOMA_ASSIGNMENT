const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { signAuthToken } = require("../../utils/authToken");
const {
  getUsersCollection,
  isValidEmail,
  normalizeEmail,
  sanitizeUser,
} = require("../utils/users");

function parseObjectId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  return new mongoose.Types.ObjectId(id);
}

function buildAuthResponse(user) {
  return {
    token: signAuthToken(user),
    user: sanitizeUser(user),
  };
}

async function register(req, res) {
  try {
    const usersCollection = getUsersCollection();
    const { email, password, displayName } = req.body || {};
    const normalizedEmail = normalizeEmail(email);
    const trimmedDisplayName = String(displayName || "").trim();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: "A valid email is required" });
    }

    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({
        error: "Password must be at least 8 characters long",
      });
    }

    const existingUser = await usersCollection.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ error: "Email is already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const now = new Date();
    const userToCreate = {
      email: normalizedEmail,
      passwordHash,
      displayName: trimmedDisplayName,
      likedArtistIds: [],
      likedArtworkIds: [],
      createdAt: now,
      updatedAt: now,
    };

    const result = await usersCollection.insertOne(userToCreate);
    const createdUser = {
      _id: result.insertedId,
      ...userToCreate,
    };

    return res.status(201).json(buildAuthResponse(createdUser));
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).json({ error: "Email is already registered" });
    }

    console.error("Failed to register user:", error.message);
    return res.status(500).json({ error: "Failed to register user" });
  }
}

async function login(req, res) {
  try {
    const usersCollection = getUsersCollection();
    const { email, password } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || typeof password !== "string" || password.length === 0) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await usersCollection.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    return res.json(buildAuthResponse(user));
  } catch (error) {
    console.error("Failed to log in user:", error.message);
    return res.status(500).json({ error: "Failed to log in user" });
  }
}

async function getCurrentUser(req, res) {
  try {
    const usersCollection = getUsersCollection();
    const userId = parseObjectId(req.auth && req.auth.userId);
    if (!userId) {
      return res.status(401).json({ error: "Invalid authorization token" });
    }

    const user = await usersCollection.findOne({ _id: userId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ user: sanitizeUser(user) });
  } catch (error) {
    console.error("Failed to fetch current user:", error.message);
    return res.status(500).json({ error: "Failed to fetch current user" });
  }
}

module.exports = {
  getCurrentUser,
  login,
  register,
};
