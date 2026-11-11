import { env } from "../../config/env.js";
import { AuthError, SmsDeliveryError } from "./errors.js";
import { AuditLog, AuthSession, OtpChallenge, User } from "./models.js";
import { InvalidPhoneNumberError, normalizeNepalPhone } from "./phone.js";
import {
  createCsrfToken,
  createOtp,
  createSessionToken,
  hashOtp,
  hashPassword,
  hashSessionToken,
  safeEqual,
  verifyPassword
} from "./security.js";
import type { PublicUser, SmsSender, UserRole, UserStatus } from "./types.js";

const OTP_LIFETIME_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_WINDOW_MS = 60 * 60 * 1000;
const OTP_MAX_PER_WINDOW = 5;
const OTP_MAX_ATTEMPTS = 5;
const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const OTP_ACKNOWLEDGEMENT = "If this number is eligible, a verification code has been sent.";

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

type UserSummary = {
  _id: { toString(): string };
  phone?: string | null;
  email?: string | null;
  role: UserRole;
  status: UserStatus;
  name?: string | null;
  businessName?: string | null;
  address?: string | null;
};

function toPublicUser(user: UserSummary): PublicUser {
  return {
    id: user._id.toString(),
    phone: user.phone || undefined,
    email: user.email || undefined,
    role: user.role,
    status: user.status,
    ...(user.name ? { name: user.name } : {}),
    ...(user.businessName ? { businessName: user.businessName } : {}),
    ...(user.address ? { address: user.address } : {})
  };
}

export async function seedDefaultAccounts(): Promise<void> {
  // 1. Seed / Upsert OWNER
  const ownerEmail = env.OWNER_EMAIL.trim().toLowerCase();
  const existingOwner = await User.findOne({ $or: [{ role: "OWNER" }, { email: ownerEmail }] }).exec();
  const ownerCreds = hashPassword(env.OWNER_PASSWORD);

  if (env.NODE_ENV === "production") {
    if (existingOwner) {
      if (existingOwner.role !== "OWNER" || existingOwner.email !== ownerEmail) {
        throw new Error("Configured production owner email conflicts with an existing user account.");
      }
      console.info("Production owner account exists; leaving its credentials and status unchanged.");
      return;
    }

    await User.create({
      email: ownerEmail,
      name: env.OWNER_NAME,
      role: "OWNER",
      status: "ACTIVE",
      passwordHash: ownerCreds.hash,
      passwordSalt: ownerCreds.salt
    });
    console.info("Created the initial production owner account.");
    return;
  }

  if (!existingOwner) {
    await User.create({
      email: ownerEmail,
      name: env.OWNER_NAME,
      role: "OWNER",
      status: "ACTIVE",
      passwordHash: ownerCreds.hash,
      passwordSalt: ownerCreds.salt
    });
  } else {
    existingOwner.email = ownerEmail;
    existingOwner.role = "OWNER";
    existingOwner.name = env.OWNER_NAME;
    existingOwner.passwordHash = ownerCreds.hash;
    existingOwner.passwordSalt = ownerCreds.salt;
    existingOwner.status = "ACTIVE";
    await existingOwner.save();
  }

  // 2. Seed / Upsert SALES MANAGER
  const salesEmail = env.SALES_EMAIL.trim().toLowerCase();
  const existingSales = await User.findOne({ email: salesEmail }).exec();
  const salesCreds = hashPassword(env.SALES_PASSWORD);

  if (!existingSales) {
    await User.create({
      email: salesEmail,
      name: env.SALES_NAME,
      role: "SALES",
      status: "ACTIVE",
      passwordHash: salesCreds.hash,
      passwordSalt: salesCreds.salt
    });
  } else {
    existingSales.name = env.SALES_NAME;
    existingSales.role = "SALES";
    existingSales.passwordHash = salesCreds.hash;
    existingSales.passwordSalt = salesCreds.salt;
    existingSales.status = "ACTIVE";
    await existingSales.save();
  }

  // 3. Seed / Upsert ACCOUNTANT
  const accountantEmail = env.ACCOUNTANT_EMAIL.trim().toLowerCase();
  const existingAccountant = await User.findOne({ email: accountantEmail }).exec();
  const accountantCreds = hashPassword(env.ACCOUNTANT_PASSWORD);

  if (!existingAccountant) {
    await User.create({
      email: accountantEmail,
      name: env.ACCOUNTANT_NAME,
      role: "ACCOUNTANT",
      status: "ACTIVE",
      passwordHash: accountantCreds.hash,
      passwordSalt: accountantCreds.salt
    });
  } else {
    existingAccountant.name = env.ACCOUNTANT_NAME;
    existingAccountant.role = "ACCOUNTANT";
    existingAccountant.passwordHash = accountantCreds.hash;
    existingAccountant.passwordSalt = accountantCreds.salt;
    existingAccountant.status = "ACTIVE";
    await existingAccountant.save();
  }

  // 4. Seed / Upsert DEMO BUYER (Retailer) - Requires phone
  const buyerEmail = env.BUYER_EMAIL.trim().toLowerCase();
  let buyerPhone = env.BUYER_PHONE;
  try {
    buyerPhone = normalizeNepalPhone(env.BUYER_PHONE);
  } catch {
    // leave as is if already normalized
  }

  const existingBuyer = await User.findOne({
    $or: [{ email: buyerEmail }, { phone: buyerPhone }]
  }).exec();
  const buyerCreds = hashPassword(env.BUYER_PASSWORD);

  if (!existingBuyer) {
    await User.create({
      email: buyerEmail,
      phone: buyerPhone,
      name: env.BUYER_NAME,
      businessName: env.BUYER_BUSINESS,
      address: env.BUYER_ADDRESS,
      role: "RETAILER",
      status: "ACTIVE",
      passwordHash: buyerCreds.hash,
      passwordSalt: buyerCreds.salt,
      phoneVerifiedAt: new Date()
    });
  } else {
    existingBuyer.email = buyerEmail;
    existingBuyer.phone = buyerPhone;
    existingBuyer.name = env.BUYER_NAME;
    existingBuyer.businessName = env.BUYER_BUSINESS;
    existingBuyer.address = env.BUYER_ADDRESS;
    existingBuyer.role = "RETAILER";
    existingBuyer.passwordHash = buyerCreds.hash;
    existingBuyer.passwordSalt = buyerCreds.salt;
    existingBuyer.status = "ACTIVE";
    await existingBuyer.save();
  }
}

export async function loginWithPassword(
  identifier: string,
  password: string
): Promise<{ user: PublicUser; sessionToken: string; csrfToken: string; expiresAt: Date }> {
  const trimmed = identifier.trim().toLowerCase();

  let user = await User.findOne({ email: trimmed }).exec();
  if (!user) {
    try {
      const normalizedPhone = normalizeNepalPhone(trimmed);
      user = await User.findOne({ phone: normalizedPhone }).exec();
    } catch {
      // not a phone number or invalid
    }
  }

  if (!user) {
    throw new AuthError("Invalid email/phone or password.", 401, "INVALID_CREDENTIALS");
  }

  if (user.status !== "ACTIVE") {
    throw new AuthError("This account has been disabled. Please contact the administrator.", 403, "ACCOUNT_DISABLED");
  }

  if (!user.passwordHash || !user.passwordSalt) {
    throw new AuthError("Password login has not been set up for this account.", 401, "PASSWORD_NOT_CONFIGURED");
  }

  const matches = verifyPassword(password, user.passwordHash, user.passwordSalt);
  if (!matches) {
    throw new AuthError("Invalid email/phone or password.", 401, "INVALID_CREDENTIALS");
  }

  const now = new Date();
  const sessionToken = createSessionToken();
  const csrfToken = createCsrfToken();
  const expiresAt = new Date(now.getTime() + SESSION_LIFETIME_MS);

  await AuthSession.create({
    userId: user._id,
    tokenHash: hashSessionToken(sessionToken),
    csrfToken,
    expiresAt
  });

  return { user: toPublicUser(user), sessionToken, csrfToken, expiresAt };
}

export async function registerBuyer(input: {
  name: string;
  phone: string;
  password: string;
  businessName: string;
  address?: string;
  email?: string;
}): Promise<{ user: PublicUser; sessionToken: string; csrfToken: string; expiresAt: Date }> {
  const phone = normalizeNepalPhone(input.phone);
  const existingByPhone = await User.findOne({ phone }).lean();
  if (existingByPhone) {
    throw new AuthError("An account with this phone number already exists.", 409, "PHONE_EXISTS");
  }

  const normalizedEmail = input.email?.trim().toLowerCase() || undefined;
  if (normalizedEmail) {
    const existingByEmail = await User.findOne({ email: normalizedEmail }).lean();
    if (existingByEmail) {
      throw new AuthError("An account with this email address already exists.", 409, "EMAIL_EXISTS");
    }
  }

  const creds = hashPassword(input.password);
  const now = new Date();

  const user = await User.create({
    phone,
    email: normalizedEmail,
    name: input.name.trim(),
    businessName: input.businessName.trim(),
    address: input.address?.trim() || "Lahan, Nepal",
    role: "RETAILER",
    status: "ACTIVE",
    passwordHash: creds.hash,
    passwordSalt: creds.salt,
    phoneVerifiedAt: now
  });

  const sessionToken = createSessionToken();
  const csrfToken = createCsrfToken();
  const expiresAt = new Date(now.getTime() + SESSION_LIFETIME_MS);

  await AuthSession.create({
    userId: user._id,
    tokenHash: hashSessionToken(sessionToken),
    csrfToken,
    expiresAt
  });

  return { user: toPublicUser(user), sessionToken, csrfToken, expiresAt };
}

export async function createStaffUser(
  input: {
    email?: string;
    password?: string;
    phone?: string;
    name?: string;
    role: Exclude<UserRole, "OWNER">;
  },
  actorUserId: string
): Promise<PublicUser> {
  let normalizedPhone: string | undefined = undefined;
  if (input.phone && input.phone.trim().length > 0) {
    normalizedPhone = normalizeNepalPhone(input.phone);
  }

  const normalizedEmail = input.email ? input.email.trim().toLowerCase() : undefined;

  let passwordHash: string | undefined = undefined;
  let passwordSalt: string | undefined = undefined;
  if (input.password) {
    const creds = hashPassword(input.password);
    passwordHash = creds.hash;
    passwordSalt = creds.salt;
  }

  try {
    const user = await User.create({
      phone: normalizedPhone,
      email: normalizedEmail,
      name: input.name,
      role: input.role,
      status: "ACTIVE",
      passwordHash,
      passwordSalt
    });

    await AuditLog.create({
      actorUserId,
      targetUserId: user._id,
      action: "USER_CREATED",
      role: user.role
    });

    return toPublicUser(user);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AuthError("An account already exists with that email or phone number.", 409, "USER_EXISTS");
    }
    throw error;
  }
}

export async function requestOtp(
  inputPhone: string,
  sender: SmsSender
): Promise<{ message: string }> {
  const phone = normalizeNepalPhone(inputPhone);
  const now = new Date();
  const recentChallenges = await OtpChallenge.countDocuments({
    phone,
    createdAt: { $gte: new Date(now.getTime() - OTP_WINDOW_MS) }
  });

  if (recentChallenges >= OTP_MAX_PER_WINDOW) {
    throw new AuthError("Too many code requests. Please try again later.", 429, "OTP_RATE_LIMITED");
  }

  const latestChallenge = await OtpChallenge.findOne({ phone }).sort({ createdAt: -1 }).lean();
  if (
    latestChallenge &&
    now.getTime() - latestChallenge.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS
  ) {
    throw new AuthError("Please wait before requesting another code.", 429, "OTP_COOLDOWN");
  }

  const existingUser = await User.findOne({ phone }).lean();
  const ownerPhone = env.OWNER_PHONE ? normalizeNepalPhone(env.OWNER_PHONE) : undefined;
  const ownerExists = await User.exists({ role: "OWNER" });
  const isOwnerSetup = !existingUser && !ownerExists && ownerPhone === phone;

  if (!isOwnerSetup && (!existingUser || existingUser.status !== "ACTIVE")) {
    return { message: OTP_ACKNOWLEDGEMENT };
  }

  const developmentOtp =
    env.NODE_ENV === "development" && phone === ownerPhone ? env.DEV_OTP_CODE : undefined;
  if (!developmentOtp && !sender.configured) {
    throw new AuthError("SMS delivery is not configured.", 503, "SMS_NOT_CONFIGURED");
  }

  const code = developmentOtp ?? createOtp();
  const challenge = await OtpChallenge.create({
    phone,
    codeHash: hashOtp(phone, code),
    purpose: isOwnerSetup ? "OWNER_SETUP" : "SIGN_IN",
    expiresAt: new Date(now.getTime() + OTP_LIFETIME_MS),
    attemptCount: 0
  });

  if (!developmentOtp) {
    try {
      await sender.sendOtp(phone, code);
    } catch (error) {
      await OtpChallenge.updateOne(
        { _id: challenge._id, consumedAt: { $exists: false } },
        { $set: { consumedAt: new Date() } }
      );

      if (error instanceof AuthError || error instanceof SmsDeliveryError) {
        throw error;
      }

      throw new SmsDeliveryError("SMS delivery failed.");
    }
  }

  return { message: OTP_ACKNOWLEDGEMENT };
}

export async function verifyOtp(
  inputPhone: string,
  code: string
): Promise<{ user: PublicUser; sessionToken: string; csrfToken: string; expiresAt: Date }> {
  const phone = normalizeNepalPhone(inputPhone);
  const now = new Date();
  const challenge = await OtpChallenge.findOne({
    phone,
    consumedAt: { $exists: false },
    expiresAt: { $gt: now },
    attemptCount: { $lt: OTP_MAX_ATTEMPTS }
  })
    .sort({ createdAt: -1 })
    .exec();

  if (!challenge || !safeEqual(challenge.codeHash, hashOtp(phone, code))) {
    if (challenge) {
      await OtpChallenge.updateOne(
        { _id: challenge._id, consumedAt: { $exists: false }, attemptCount: { $lt: OTP_MAX_ATTEMPTS } },
        { $inc: { attemptCount: 1 } }
      );
    }
    throw new AuthError("The verification code is invalid or expired.", 401, "INVALID_OTP");
  }

  const consumedChallenge = await OtpChallenge.findOneAndUpdate(
    {
      _id: challenge._id,
      consumedAt: { $exists: false },
      expiresAt: { $gt: now },
      attemptCount: { $lt: OTP_MAX_ATTEMPTS }
    },
    { $set: { consumedAt: now } },
    { new: true }
  );
  if (!consumedChallenge) {
    throw new AuthError("The verification code is invalid or expired.", 401, "INVALID_OTP");
  }

  let user = await User.findOne({ phone }).exec();
  const ownerPhone = env.OWNER_PHONE ? normalizeNepalPhone(env.OWNER_PHONE) : undefined;
  if (!user && consumedChallenge.purpose === "OWNER_SETUP" && ownerPhone === phone) {
    try {
      user = await User.create({
        phone,
        role: "OWNER",
        status: "ACTIVE",
        phoneVerifiedAt: now
      });
      await AuditLog.create({
        actorUserId: user._id,
        targetUserId: user._id,
        action: "OWNER_BOOTSTRAPPED",
        role: "OWNER"
      });
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }
      user = await User.findOne({ phone }).exec();
    }
  }

  if (!user || user.status !== "ACTIVE") {
    throw new AuthError("The verification code is invalid or expired.", 401, "INVALID_OTP");
  }

  user.phoneVerifiedAt = now;
  await user.save();

  const sessionToken = createSessionToken();
  const csrfToken = createCsrfToken();
  const expiresAt = new Date(now.getTime() + SESSION_LIFETIME_MS);
  await AuthSession.create({
    userId: user._id,
    tokenHash: hashSessionToken(sessionToken),
    csrfToken,
    expiresAt
  });

  return { user: toPublicUser(user), sessionToken, csrfToken, expiresAt };
}

export async function findSession(token: string): Promise<{
  user: PublicUser;
  sessionId: string;
  csrfToken: string;
} | null> {
  const session = await AuthSession.findOne({
    tokenHash: hashSessionToken(token),
    revokedAt: { $exists: false },
    expiresAt: { $gt: new Date() }
  }).exec();
  if (!session) {
    return null;
  }

  const user = await User.findOne({ _id: session.userId, status: "ACTIVE" }).exec();
  if (!user) {
    return null;
  }

  return {
    user: toPublicUser(user),
    sessionId: session._id.toString(),
    csrfToken: session.csrfToken
  };
}

export async function revokeSession(sessionId: string): Promise<void> {
  await AuthSession.updateOne(
    { _id: sessionId, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } }
  );
}

export async function listUsers(page: number, pageSize: number, roleFilter?: string): Promise<{
  users: PublicUser[];
  page: number;
  pageSize: number;
  total: number;
}> {
  const query = roleFilter ? { role: roleFilter } : {};
  const [users, total] = await Promise.all([
    User.find(query)
      .sort({ createdAt: -1, _id: 1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    User.countDocuments(query)
  ]);

  return { users: users.map(toPublicUser), page, pageSize, total };
}

export async function updateUserStatus(
  userId: string,
  status: UserStatus,
  actingUserId: string
): Promise<PublicUser> {
  const user = await User.findById(userId).exec();
  if (!user) {
    throw new AuthError("User was not found.", 404, "USER_NOT_FOUND");
  }
  if (user.role === "OWNER") {
    throw new AuthError("The owner account cannot be disabled.", 403, "OWNER_PROTECTED");
  }
  if (user._id.toString() === actingUserId && status === "DISABLED") {
    throw new AuthError("You cannot disable your own account.", 403, "SELF_DISABLE");
  }

  const previousStatus = user.status;
  user.status = status;
  await user.save();
  if (status === "DISABLED") {
    await AuthSession.updateMany(
      { userId: user._id, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } }
    );
  }
  if (previousStatus !== status) {
    await AuditLog.create({
      actorUserId: actingUserId,
      targetUserId: user._id,
      action: "USER_STATUS_CHANGED",
      role: user.role,
      previousStatus,
      newStatus: status
    });
  }
  return toPublicUser(user);
}
