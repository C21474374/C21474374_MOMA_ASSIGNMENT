const { verifyAuthToken } = require("../utils/authToken");

// Extract the bearer token value from an Authorization header.
function getBearerToken(authorizationHeader) {
  if (typeof authorizationHeader !== "string") {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token.trim();
}

// Guard protected routes by validating the JWT and attaching user info to the request.
function requireAuth(req, res, next) {
  const token = getBearerToken(req.headers.authorization);
  if (!token) {
    return res.status(401).json({ error: "Authorization token is required" });
  }

  try {
    const payload = verifyAuthToken(token);
    if (typeof payload.sub !== "string" || payload.sub.length === 0) {
      return res.status(401).json({ error: "Invalid authorization token" });
    }

    req.auth = {
      userId: payload.sub,
      email: payload.email,
    };

    return next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = {
  requireAuth,
};
