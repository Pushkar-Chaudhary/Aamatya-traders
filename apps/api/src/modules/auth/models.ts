import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { USER_ROLES } from "./types.js";

const userSchema = new Schema(
  {
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String },
    passwordSalt: { type: String },
    name: { type: String, trim: true, maxlength: 120 },
    businessName: { type: String, trim: true, maxlength: 120 },
    address: { type: String, trim: true, maxlength: 200 },
    role: { type: String, enum: USER_ROLES, required: true },
    status: { type: String, enum: ["ACTIVE", "DISABLED"], default: "ACTIVE", required: true },
    phoneVerifiedAt: { type: Date }
  },
  { timestamps: true }
);

userSchema.index({ phone: 1 }, { unique: true, sparse: true });
userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index(
  { role: 1 },
  { unique: true, partialFilterExpression: { role: "OWNER" }, name: "one_owner_only" }
);

const sessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    csrfToken: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date }
  },
  { timestamps: true }
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const otpChallengeSchema = new Schema(
  {
    phone: { type: String, required: true, index: true },
    codeHash: { type: String, required: true },
    purpose: { type: String, enum: ["SIGN_IN", "OWNER_SETUP"], required: true },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date },
    attemptCount: { type: Number, default: 0, min: 0, max: 5 }
  },
  { timestamps: true }
);

otpChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpChallengeSchema.index({ phone: 1, createdAt: -1 });

const auditLogSchema = new Schema(
  {
    actorUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    targetUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: {
      type: String,
      required: true
    },
    role: { type: String, enum: USER_ROLES },
    previousStatus: { type: String, enum: ["ACTIVE", "DISABLED"] },
    newStatus: { type: String, enum: ["ACTIVE", "DISABLED"] }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ targetUserId: 1, createdAt: -1 });

export type UserDocument = InferSchemaType<typeof userSchema>;
type SessionDocument = InferSchemaType<typeof sessionSchema>;
type OtpChallengeDocument = InferSchemaType<typeof otpChallengeSchema>;
type AuditLogDocument = InferSchemaType<typeof auditLogSchema>;

const User =
  (mongoose.models.User as Model<UserDocument> | undefined) ??
  mongoose.model<UserDocument>("User", userSchema);
const AuthSession =
  (mongoose.models.AuthSession as Model<SessionDocument> | undefined) ??
  mongoose.model<SessionDocument>("AuthSession", sessionSchema);
const OtpChallenge =
  (mongoose.models.OtpChallenge as Model<OtpChallengeDocument> | undefined) ??
  mongoose.model<OtpChallengeDocument>("OtpChallenge", otpChallengeSchema);
const AuditLog =
  (mongoose.models.AuditLog as Model<AuditLogDocument> | undefined) ??
  mongoose.model<AuditLogDocument>("AuditLog", auditLogSchema);

export { User, AuthSession, OtpChallenge, AuditLog };
