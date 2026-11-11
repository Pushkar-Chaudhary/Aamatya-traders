import { createHmac, randomInt, randomBytes, timingSafeEqual, scryptSync } from "node:crypto";
import { env } from "../../config/env.js";

function getAuthSecret(): string {
  return env.AUTH_SECRET || env.OTP_HMAC_SECRET || "amatya_default_secure_secret_hash_key_2026";
}

export function createOtp(): string {
  return randomInt(100000, 1000000).toString();
}

export function hashOtp(phone: string, code: string): string {
  return createHmac("sha256", getAuthSecret()).update(`${phone}:${code}`).digest("hex");
}

export function hashSessionToken(token: string): string {
  return createHmac("sha256", getAuthSecret()).update(token).digest("hex");
}

export function hashRateLimitKey(value: string): string {
  return createHmac("sha256", getAuthSecret()).update(`rate:${value}`).digest("hex");
}

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function createCsrfToken(): string {
  return randomBytes(32).toString("base64url");
}

export function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function hashPassword(password: string, customSalt?: string): { hash: string; salt: string } {
  const salt = customSalt ?? randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const computedHash = scryptSync(password, salt, 64).toString("hex");
    return safeEqual(computedHash, hash);
  } catch {
    return false;
  }
}
