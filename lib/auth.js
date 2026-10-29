import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "futsal_terrassa_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  return secret && Buffer.byteLength(secret, "utf8") >= 32 ? secret : null;
}

export function constantTimeEqual(left, right) {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  const sameLength = leftBuffer.length === rightBuffer.length;
  const comparableRight = sameLength ? rightBuffer : Buffer.alloc(leftBuffer.length);
  const equal = timingSafeEqual(leftBuffer, comparableRight);
  return sameLength && equal;
}

export function createSession(username) {
  const secret = getSecret();
  if (!secret) throw new Error("AUTH_SECRET must contain at least 32 characters");

  const payload = Buffer.from(JSON.stringify({
    username,
    expiresAt: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySession(token) {
  const secret = getSecret();
  const username = process.env.AUTH_USERNAME;
  if (!secret || !username || typeof token !== "string") return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [payload, signature] = parts;
  const expected = createHmac("sha256", secret).update(payload).digest();
  const received = Buffer.from(signature, "base64url");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return false;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return session.username === username
      && Number.isInteger(session.expiresAt)
      && session.expiresAt > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}
