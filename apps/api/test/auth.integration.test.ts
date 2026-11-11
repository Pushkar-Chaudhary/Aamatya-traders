import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import mongoose from "mongoose";
import request from "supertest";
import type { SmsSender } from "../src/modules/auth/types.js";

process.env.MONGODB_TEST_URI ??= "mongodb://127.0.0.1:27017/amatya_traders_test";
process.env.OTP_HMAC_SECRET ??= "test-only-hmac-secret-for-auth-suite";
process.env.OWNER_PHONE = "+9779841234567";
process.env.WEB_ORIGIN ??= "http://localhost:5173";
process.env.NODE_ENV = "test";

const [{ env }, { createApp }, { AuditLog, AuthSession, OtpChallenge, User }, { Product }, { requestOtp, verifyOtp }] = await Promise.all([
  import("../src/config/env.js"),
  import("../src/app.js"),
  import("../src/modules/auth/models.js"),
  import("../src/modules/products/model.js"),
  import("../src/modules/auth/service.js")
]);

const sentCodes: string[] = [];
const testSmsSender: SmsSender = {
  configured: true,
  async sendOtp(_phone, code) {
    sentCodes.push(code);
  }
};
const app = createApp(testSmsSender);
const trustedOrigin = env.WEB_ORIGIN;

let mongoConnected = false;

before(async () => {
  if (!env.MONGODB_TEST_URI) {
    console.warn("Skipping integration test: MONGODB_TEST_URI is not set.");
    return;
  }
  if (env.NODE_ENV === "production" || env.MONGODB_TEST_URI === env.MONGODB_URI) {
    throw new Error("Auth integration tests require a dedicated non-production MongoDB database.");
  }

  try {
    await mongoose.connect(env.MONGODB_TEST_URI, { serverSelectionTimeoutMS: 2000 });
    mongoConnected = true;
    await Promise.all([User.init(), AuthSession.init(), OtpChallenge.init(), AuditLog.init(), Product.init()]);
    await Promise.all([
      User.deleteMany({}),
      AuthSession.deleteMany({}),
      OtpChallenge.deleteMany({}),
      AuditLog.deleteMany({}),
      Product.deleteMany({})
    ]);
  } catch (error) {
    console.warn("Notice: Local MongoDB server is not reachable; skipping live DB integration test suite.");
    mongoConnected = false;
  }
});

after(async () => {
  if (mongoConnected) {
    await Promise.all([
      User.deleteMany({}),
      AuthSession.deleteMany({}),
      OtpChallenge.deleteMany({}),
      AuditLog.deleteMany({}),
      Product.deleteMany({})
    ]);
    await mongoose.disconnect();
  }
});

test("bootstraps one owner by verified phone, enforces CSRF, and revokes sessions", async () => {
  if (!mongoConnected) return;
  const agent = request.agent(app);
  const otpResponse = await agent
    .post("/api/auth/otp/request")
    .set("Origin", trustedOrigin)
    .send({ phone: "9841234567" });

  assert.equal(otpResponse.status, 202);
  assert.equal(sentCodes.length, 1);
  assert.match(otpResponse.body.message, /If this number is eligible/);

  const verifyResponse = await agent
    .post("/api/auth/otp/verify")
    .set("Origin", trustedOrigin)
    .send({ phone: "+9779841234567", code: sentCodes[0] });

  assert.equal(verifyResponse.status, 200);
  assert.equal(verifyResponse.body.user.role, "OWNER");
  assert.ok(verifyResponse.headers["set-cookie"]);
  assert.equal(await AuditLog.countDocuments({ action: "OWNER_BOOTSTRAPPED" }), 1);

  const meResponse = await agent.get("/api/auth/me");
  assert.equal(meResponse.status, 200);
  assert.equal(meResponse.body.user.phone, "+9779841234567");
  const csrfToken = meResponse.body.csrfToken as string;

  const rejectedCreate = await agent
    .post("/api/auth/users")
    .set("Origin", trustedOrigin)
    .send({ phone: "9812345678", role: "SALES" });
  assert.equal(rejectedCreate.status, 403);
  assert.equal(rejectedCreate.body.code, "CSRF_INVALID");

  const createdUser = await agent
    .post("/api/auth/users")
    .set("Origin", trustedOrigin)
    .set("x-csrf-token", csrfToken)
    .send({ phone: "9812345678", name: "Sales Employee", role: "SALES" });
  assert.equal(createdUser.status, 201);
  assert.equal(createdUser.body.user.role, "SALES");
  assert.equal(await AuditLog.countDocuments({ action: "USER_CREATED" }), 1);

  const createdProduct = await agent
    .post("/api/products")
    .set("Origin", trustedOrigin)
    .set("x-csrf-token", csrfToken)
    .send({
      name: "Cerelac Wheat",
      sku: "cer-001",
      brand: "Nestle",
      unit: "carton",
      purchasePricePaisa: 12500,
      wholesalePricePaisa: 15000
    });
  assert.equal(createdProduct.status, 201);
  assert.equal(createdProduct.body.product.sku, "CER-001");
  assert.equal(createdProduct.body.product.wholesalePricePaisa, 15000);

  const productList = await agent.get("/api/products?search=CER-001");
  assert.equal(productList.status, 200);
  assert.equal(productList.body.total, 1);

  const draftProduct = await agent
    .post("/api/products")
    .set("Origin", trustedOrigin)
    .set("x-csrf-token", csrfToken)
    .send({ name: "Coffee", unit: "other" });
  assert.equal(draftProduct.status, 201);
  assert.equal(draftProduct.body.product.status, "DRAFT");
  assert.equal(draftProduct.body.product.wholesalePricePaisa, null);
  assert.match(draftProduct.body.product.sku, /^COFFEE-[A-F0-9]{6}$/);

  const activateUnpriced = await agent
    .patch(`/api/products/${draftProduct.body.product.id}`)
    .set("Origin", trustedOrigin)
    .set("x-csrf-token", csrfToken)
    .send({ name: "Coffee", unit: "other", status: "ACTIVE" });
  assert.equal(activateUnpriced.status, 400);

  const duplicateSku = await agent
    .post("/api/products")
    .set("Origin", trustedOrigin)
    .set("x-csrf-token", csrfToken)
    .send({ name: "Duplicate", sku: "CER-001", unit: "piece", wholesalePricePaisa: 100 });
  assert.equal(duplicateSku.status, 409);

  const salesAgent = request.agent(app);
  const salesOtp = await salesAgent
    .post("/api/auth/otp/request")
    .set("Origin", trustedOrigin)
    .send({ phone: "+9779812345678" });
  assert.equal(salesOtp.status, 202);

  const salesLogin = await salesAgent
    .post("/api/auth/otp/verify")
    .set("Origin", trustedOrigin)
    .send({ phone: "+9779812345678", code: sentCodes[1] });
  assert.equal(salesLogin.status, 200);
  assert.equal(salesLogin.body.user.role, "SALES");
  const forbiddenProductCreate = await salesAgent
    .post("/api/products")
    .set("Origin", trustedOrigin)
    .send({ name: "Unauthorized", sku: "NO-ACCESS", unit: "piece", wholesalePricePaisa: 100 });
  assert.equal(forbiddenProductCreate.status, 403);

  const salesMe = await salesAgent.get("/api/auth/me");
  assert.equal(salesMe.status, 200);
  const salesCsrf = salesMe.body.csrfToken as string;
  const forbiddenList = await salesAgent.get("/api/auth/users");
  assert.equal(forbiddenList.status, 403);

  const disableSales = await agent
    .patch(`/api/auth/users/${createdUser.body.user.id}/status`)
    .set("Origin", trustedOrigin)
    .set("x-csrf-token", csrfToken)
    .send({ status: "DISABLED" });
  assert.equal(disableSales.status, 200);
  assert.equal(await AuditLog.countDocuments({ action: "USER_STATUS_CHANGED" }), 1);
  assert.equal((await salesAgent.get("/api/auth/me")).status, 401);

  const reenableSales = await agent
    .patch(`/api/auth/users/${createdUser.body.user.id}/status`)
    .set("Origin", trustedOrigin)
    .set("x-csrf-token", csrfToken)
    .send({ status: "ACTIVE" });
  assert.equal(reenableSales.status, 200);
  assert.equal((await salesAgent.get("/api/auth/me")).status, 401);
  assert.equal(salesCsrf.length > 0, true);

  const replay = await agent
    .post("/api/auth/otp/verify")
    .set("Origin", trustedOrigin)
    .send({ phone: "+9779841234567", code: sentCodes[0] });
  assert.equal(replay.status, 401);

  const logout = await agent
    .post("/api/auth/logout")
    .set("Origin", trustedOrigin)
    .set("x-csrf-token", csrfToken);
  assert.equal(logout.status, 204);
  assert.equal((await agent.get("/api/auth/me")).status, 401);
});

test("does not send OTPs to unregistered phone numbers and validates input", async () => {
  if (!mongoConnected) return;
  const beforeCount = sentCodes.length;
  const unknown = await request(app)
    .post("/api/auth/otp/request")
    .set("Origin", trustedOrigin)
    .send({ phone: "+9779800000000" });

  assert.equal(unknown.status, 202);
  assert.equal(unknown.body.message, "If this number is eligible, a verification code has been sent.");
  assert.equal(sentCodes.length, beforeCount);

  const invalid = await request(app)
    .post("/api/auth/otp/request")
    .set("Origin", trustedOrigin)
    .send({ phone: "not-a-phone" });

  assert.equal(invalid.status, 400);
});

test("accepts the configured development OTP only for the designated owner phone", async () => {
  if (!mongoConnected) return;
  const originalNodeEnv = env.NODE_ENV;
  const originalDevOtp = env.DEV_OTP_CODE;
  await OtpChallenge.deleteMany({});
  env.NODE_ENV = "development";
  env.DEV_OTP_CODE = "123456";

  try {
    const ineligibleRequest = await requestOtp("+9779812345678", testSmsSender);
    assert.match(ineligibleRequest.message, /If this number is eligible/);
    const sentCountBeforeOwner = sentCodes.length;
    await assert.rejects(verifyOtp("+9779812345678", "123456"));

    const challenge = await requestOtp("+9779841234567", testSmsSender);
    assert.match(challenge.message, /If this number is eligible/);
    assert.equal(sentCodes.length, sentCountBeforeOwner);

    const login = await verifyOtp("9841234567", "123456");
    assert.equal(login.user.role, "OWNER");

    await assert.rejects(verifyOtp("9841234567", "123456"));
  } finally {
    env.NODE_ENV = originalNodeEnv;
    env.DEV_OTP_CODE = originalDevOtp;
  }
});

test("rejects requests from an untrusted browser origin", async () => {
  if (!mongoConnected) return;
  const response = await request(app)
    .post("/api/auth/otp/request")
    .set("Origin", "https://malicious.example")
    .send({ phone: "+9779841234567" });

  assert.equal(response.status, 403);
  assert.equal(response.body.code, "ORIGIN_NOT_ALLOWED");
});

test("returns a validation response for malformed JSON", async () => {
  if (!mongoConnected) return;
  const response = await request(app)
    .post("/api/auth/otp/request")
    .set("Origin", trustedOrigin)
    .set("Content-Type", "application/json")
    .send("{");

  assert.equal(response.status, 400);
  assert.equal(response.body.code, "INVALID_JSON");
});
