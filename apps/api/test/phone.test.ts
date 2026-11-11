import assert from "node:assert/strict";
import { test } from "node:test";
import { InvalidPhoneNumberError, normalizeNepalPhone, toSparrowRecipient } from "../src/modules/auth/phone.js";

test("normalizes Nepal mobile numbers to E.164 and Sparrow's national format", () => {
  const phone = normalizeNepalPhone("9841234567");

  assert.equal(phone, "+9779841234567");
  assert.equal(toSparrowRecipient(phone), "9841234567");
});

test("rejects non-Nepal and malformed phone numbers", () => {
  assert.throws(() => normalizeNepalPhone("+14155552671"), InvalidPhoneNumberError);
  assert.throws(() => normalizeNepalPhone("not a phone"), InvalidPhoneNumberError);
});
