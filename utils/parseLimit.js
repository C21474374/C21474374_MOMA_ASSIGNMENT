function parseLimit(limitValue, defaultLimit = 50, maxLimit = 200) {
  const parsed = Number.parseInt(limitValue, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return defaultLimit;
  }

  return Math.min(parsed, maxLimit);
}

module.exports = parseLimit;
