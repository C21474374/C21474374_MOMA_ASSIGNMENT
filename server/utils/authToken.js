const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "artapp-dev-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

if (!process.env.JWT_SECRET) {
  console.warn(
    "JWT_SECRET is not set. Using a development fallback secret for auth tokens."
  );
}

// Sign the JWT payload used by the frontend to restore authenticated sessions.
function signAuthToken(user) {
  return jwt.sign(
    {
      sub: String(user._id),
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Verify and decode a JWT presented by the client.
function verifyAuthToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = {
  signAuthToken,
  verifyAuthToken,
};
