import assert from "node:assert/strict";
import { test } from "node:test";
import { hashPassword, verifyPassword } from "../src/modules/auth/security.js";

test("hashes password with salt and successfully verifies match", () => {
  const password = "Owner@Amatya2026";
  const { hash, salt } = hashPassword(password);

  assert.ok(hash.length > 20);
  assert.ok(salt.length > 10);
  assert.equal(verifyPassword(password, hash, salt), true);
  assert.equal(verifyPassword("WrongPassword123", hash, salt), false);
});

