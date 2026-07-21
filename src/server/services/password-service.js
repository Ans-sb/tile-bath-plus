const crypto = require("crypto");
const { promisify } = require("util");

const scryptAsync = promisify(crypto.scrypt);
const PASSWORD_HASH_PREFIX = "scrypt";
const PASSWORD_HASH_KEYLEN = 64;

function cleanPassword(value) {
  return String(value || "");
}

function isPasswordHash(value) {
  return String(value || "").startsWith(`${PASSWORD_HASH_PREFIX}$`);
}

async function hashPassword(password) {
  const clean = cleanPassword(password);
  if (!clean) return "";
  if (isPasswordHash(clean)) return clean;
  const salt = crypto.randomBytes(16).toString("base64url");
  const derived = await scryptAsync(clean, salt, PASSWORD_HASH_KEYLEN);
  return `${PASSWORD_HASH_PREFIX}$${salt}$${Buffer.from(derived).toString("base64url")}`;
}

async function verifyPassword(password, storedValue) {
  const clean = cleanPassword(password);
  const stored = cleanPassword(storedValue);
  if (!clean || !stored) return { ok: false, needsRehash: false };

  if (!isPasswordHash(stored)) {
    return {
      ok: safeEqualText(clean, stored),
      needsRehash: true
    };
  }

  const [, salt, expectedHash] = stored.split("$");
  if (!salt || !expectedHash) return { ok: false, needsRehash: true };
  const derived = await scryptAsync(clean, salt, PASSWORD_HASH_KEYLEN);
  return {
    ok: safeEqualText(Buffer.from(derived).toString("base64url"), expectedHash),
    needsRehash: false
  };
}

function safeEqualText(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

module.exports = {
  hashPassword,
  isPasswordHash,
  verifyPassword
};
