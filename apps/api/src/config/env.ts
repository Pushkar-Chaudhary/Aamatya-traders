import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(currentDirectory, "../../../../.env") });

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),
  MONGODB_URI: z.string().min(1).optional(),
  MONGODB_TEST_URI: z.string().min(1).optional(),
  AUTH_SECRET: z.string().min(32).default("29c245772d250667ed77e32204f34e454e833a850244088589bfb5873391e008"),
  OTP_HMAC_SECRET: z.string().min(16).optional(),

  // Staff Credentials (.env driven, no phone required)
  OWNER_EMAIL: z.string().email().default("owner@amatya.com"),
  OWNER_PASSWORD: z.string().min(6).default("Owner@Amatya2026"),
  OWNER_NAME: z.string().default("Amatya Owner"),

  SALES_EMAIL: z.string().email().default("sales@amatya.com"),
  SALES_PASSWORD: z.string().min(6).default("Sales@Amatya2026"),
  SALES_NAME: z.string().default("Sales Manager"),

  ACCOUNTANT_EMAIL: z.string().email().default("accountant@amatya.com"),
  ACCOUNTANT_PASSWORD: z.string().min(6).default("Accountant@Amatya2026"),
  ACCOUNTANT_NAME: z.string().default("Senior Accountant"),

  // Buyer Credentials (phone IS required)
  BUYER_EMAIL: z.string().email().default("buyer@amatya.com"),
  BUYER_PHONE: z.string().default("9848730175"),
  BUYER_PASSWORD: z.string().min(6).default("Buyer@Amatya2026"),
  BUYER_NAME: z.string().default("Ramesh Sah"),
  BUYER_BUSINESS: z.string().default("Lahan Kirana & General Store"),
  BUYER_ADDRESS: z.string().default("Main Bazaar Road, Ward 4, Lahan, Siraha"),

  // Optional phone OTP legacy settings
  OWNER_PHONE: z.string().optional(),
  DEV_OTP_CODE: z.string().regex(/^\d{6}$/).optional(),
  SPARROW_SMS_TOKEN: z.string().min(1).optional(),
  SPARROW_SMS_SENDER_ID: z.string().min(1).optional()
});

const result = environmentSchema.safeParse(process.env);

if (!result.success) {
  console.error("Invalid API environment configuration:", result.error.flatten().fieldErrors);
  throw new Error("API environment validation failed");
}

export const env = result.data;

if (env.NODE_ENV === "production") {
  const required = ["MONGODB_URI", "WEB_ORIGIN", "AUTH_SECRET", "OTP_HMAC_SECRET", "OWNER_EMAIL", "OWNER_PASSWORD"];
  const missing = required.filter((key) => !process.env[key]?.trim());
  const webOrigin = new URL(env.WEB_ORIGIN);
  const unsafeSecrets =
    env.AUTH_SECRET === "29c245772d250667ed77e32204f34e454e833a850244088589bfb5873391e008" ||
    env.OWNER_PASSWORD === "Owner@Amatya2026" ||
    env.AUTH_SECRET === env.OTP_HMAC_SECRET ||
    (env.OTP_HMAC_SECRET !== undefined && env.OTP_HMAC_SECRET.length < 32) ||
    env.OWNER_PASSWORD.length < 16;
  const unsafeOrigin = webOrigin.protocol !== "https:" || webOrigin.hostname === "localhost";

  if (missing.length > 0 || unsafeSecrets || unsafeOrigin) {
    if (missing.length > 0) {
      console.error("Missing required production configuration:", missing);
    }
    if (unsafeSecrets) {
      console.error("Production secrets must be unique, non-demo values; owner password must be at least 16 characters and OTP secret at least 32.");
    }
    if (unsafeOrigin) {
      console.error("WEB_ORIGIN must use HTTPS and cannot be localhost in production.");
    }
    throw new Error("Production environment validation failed");
  }
}
