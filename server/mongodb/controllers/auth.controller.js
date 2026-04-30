const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { signAuthToken } = require("../../utils/authToken");
const {
  getUsersCollection,
  isValidEmail,
  normalizeEmail,
  sanitizeUser,
} = require("../utils/users");

// Validate a route id param and convert it to ObjectId.
function parseObjectId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  return new mongoose.Types.ObjectId(id);
}

// Package a signed JWT together with the safe user payload returned to the client.
function buildAuthResponse(user) {
  return {
    token: signAuthToken(user),
    user: sanitizeUser(user),
  };
}

// Resolve the authenticated user id from the JWT payload attached by the auth middleware.
function getAuthenticatedUserId(req) {
  return parseObjectId(req.auth && req.auth.userId);
}

// Validate a liked record id before storing it on a user profile.
function parseLikedRecordId(id) {
  if (typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  return id.trim();
}

// Return the safe current user payload after profile and like changes.
async function buildCurrentUserResponse(usersCollection, userId) {
  const user = await usersCollection.findOne({ _id: userId });
  if (!user) {
    return null;
  }

  return { user: sanitizeUser(user) };
}

// Create a new account, hash the password, and return the signed session payload.
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

// Verify user credentials and return a signed session payload for the matched account.
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

// Resolve the currently authenticated user from the bearer token payload.
async function getCurrentUser(req, res) {
  try {
    const usersCollection = getUsersCollection();
    const userId = getAuthenticatedUserId(req);
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

// Update account profile fields for the currently authenticated user.
async function updateCurrentUser(req, res) {
  try {
    const usersCollection = getUsersCollection();
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Invalid authorization token" });
    }

    const { email, displayName, password } = req.body || {};
    const updateData = {};
    let hasChanges = false;

    if (Object.prototype.hasOwnProperty.call(req.body || {}, "displayName")) {
      updateData.displayName = String(displayName || "").trim();
      hasChanges = true;
    }

    if (Object.prototype.hasOwnProperty.call(req.body || {}, "email")) {
      const normalizedEmail = normalizeEmail(email);
      if (!isValidEmail(normalizedEmail)) {
        return res.status(400).json({ error: "A valid email is required" });
      }

      const existingUser = await usersCollection.findOne({
        email: normalizedEmail,
        _id: { $ne: userId },
      });
      if (existingUser) {
        return res.status(409).json({ error: "Email is already registered" });
      }

      updateData.email = normalizedEmail;
      hasChanges = true;
    }

    if (typeof password === "string" && password.length > 0) {
      if (password.length < 8) {
        return res.status(400).json({
          error: "Password must be at least 8 characters long",
        });
      }

      updateData.passwordHash = await bcrypt.hash(password, 12);
      hasChanges = true;
    }

    if (!hasChanges) {
      return res.status(400).json({ error: "At least one account field is required" });
    }

    updateData.updatedAt = new Date();

    const updateResult = await usersCollection.updateOne(
      { _id: userId },
      { $set: updateData }
    );
    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const updatedUser = await usersCollection.findOne({ _id: userId });
    return res.json(buildAuthResponse(updatedUser));
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).json({ error: "Email is already registered" });
    }

    console.error("Failed to update current user:", error.message);
    return res.status(500).json({ error: "Failed to update current user" });
  }
}

// Delete the currently authenticated user account.
async function deleteCurrentUser(req, res) {
  try {
    const usersCollection = getUsersCollection();
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Invalid authorization token" });
    }

    const deleteResult = await usersCollection.deleteOne({ _id: userId });
    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Failed to delete current user:", error.message);
    return res.status(500).json({ error: "Failed to delete current user" });
  }
}

// Add or remove a liked record id on the current user's profile and return the safe user payload.
async function updateCurrentUserLike(req, res, fieldName, recordId, shouldLike) {
  try {
    const usersCollection = getUsersCollection();
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Invalid authorization token" });
    }

    const parsedRecordId = parseLikedRecordId(recordId);
    if (!parsedRecordId) {
      return res.status(400).json({ error: "Invalid record id" });
    }

    const updateOperation = shouldLike
      ? {
          $addToSet: { [fieldName]: parsedRecordId },
          $set: { updatedAt: new Date() },
        }
      : {
          $pull: { [fieldName]: parsedRecordId },
          $set: { updatedAt: new Date() },
        };

    const updateResult = await usersCollection.updateOne(
      { _id: userId },
      updateOperation
    );
    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const responsePayload = await buildCurrentUserResponse(usersCollection, userId);
    return res.json(responsePayload);
  } catch (error) {
    console.error("Failed to update liked record for current user:", error.message);
    return res.status(500).json({ error: "Failed to update liked items" });
  }
}

// Add an artist id to the current user's saved likes.
async function likeArtist(req, res) {
  return updateCurrentUserLike(
    req,
    res,
    "likedArtistIds",
    req.params.artistId,
    true
  );
}

// Remove an artist id from the current user's saved likes.
async function unlikeArtist(req, res) {
  return updateCurrentUserLike(
    req,
    res,
    "likedArtistIds",
    req.params.artistId,
    false
  );
}

// Add an artwork id to the current user's saved likes.
async function likeArtwork(req, res) {
  return updateCurrentUserLike(
    req,
    res,
    "likedArtworkIds",
    req.params.artworkId,
    true
  );
}

// Remove an artwork id from the current user's saved likes.
async function unlikeArtwork(req, res) {
  return updateCurrentUserLike(
    req,
    res,
    "likedArtworkIds",
    req.params.artworkId,
    false
  );
}

module.exports = {
  deleteCurrentUser,
  getCurrentUser,
  likeArtist,
  likeArtwork,
  login,
  register,
  unlikeArtist,
  unlikeArtwork,
  updateCurrentUser,
};
