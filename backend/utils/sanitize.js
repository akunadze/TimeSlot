/**
 * Strip HTML tags and null bytes from a string.
 * Applied to all free-text inputs before they are stored in the database.
 */
function sanitizeText(value) {
  if (value == null) return value;
  if (typeof value !== 'string') return value;
  return value
    .replace(/\0/g, '')           // null bytes
    .replace(/<[^>]*>/g, '')      // HTML tags
    .trim();
}

/**
 * Parse a route/query param as a positive integer.
 * Returns the integer, or null if the value is not a valid positive integer.
 */
function parseId(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

/**
 * Validate a date string is in YYYY-MM-DD format.
 * Returns the string if valid, or null otherwise.
 */
function parseDate(value) {
  if (typeof value !== 'string') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return value;
}

module.exports = { sanitizeText, parseId, parseDate };
