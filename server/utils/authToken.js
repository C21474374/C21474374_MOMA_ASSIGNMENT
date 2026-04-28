const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "artapp-dev-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

if (!process.env.JWT_SECRET) {
  console.warn(
    "JWT_SECRET is not set. Using a development fallback secret for auth tokens."
  );
}

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

function verifyAuthToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = {
  signAuthToken,
  verifyAuthToken,
};
