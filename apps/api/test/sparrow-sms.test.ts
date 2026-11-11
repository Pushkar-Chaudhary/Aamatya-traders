import assert from "node:assert/strict";
import { test } from "node:test";
import { AuthError, SmsDeliveryError } from "../src/modules/auth/errors.js";
import { SparrowSmsSender } from "../src/modules/auth/sparrow-sms.js";

test("sends an OTP to Sparrow over HTTPS using form-encoded fields", async () => {
  let requestUrl = "";
  let requestBody = "";
  const sender = new SparrowSmsSender(
    { token: "test-token", senderId: "AMATYA" },
    async (input, init) => {
      requestUrl = String(input);
      requestBody = String(init?.body);
      return new Response(JSON.stringify({ response_code: 200 }), { status: 200 });
    }
  );

  await sender.sendOtp("+9779841234567", "123456");

  const form = new URLSearchParams(requestBody);
  assert.equal(requestUrl, "https://api.sparrowsms.com/v2/sms/");
  assert.equal(form.get("token"), "test-token");
  assert.equal(form.get("from"), "AMATYA");
  assert.equal(form.get("to"), "9841234567");
  assert.match(form.get("text") ?? "", /123456/);
});

test("does not send when Sparrow credentials are absent", async () => {
  const sender = new SparrowSmsSender({ token: undefined, senderId: undefined });

  assert.equal(sender.configured, false);
  await assert.rejects(sender.sendOtp("+9779841234567", "123456"), AuthError);
});

test("surfaces provider rejection without returning provider details", async () => {
  const sender = new SparrowSmsSender(
    { token: "test-token", senderId: "AMATYA" },
    async () => new Response(JSON.stringify({ response_code: 1002, response: "Invalid Token" }), { status: 403 })
  );

  await assert.rejects(sender.sendOtp("+9779841234567", "123456"), SmsDeliveryError);
});
