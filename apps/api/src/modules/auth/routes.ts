import { Router } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../../config/env.js";
import { AuthError, SmsDeliveryError } from "./errors.js";
import { InvalidPhoneNumberError } from "./phone.js";
import {
  authContext,
  requireAuth,
  requireCsrf,
  requireRoles,
  requireTrustedOrigin,
  SESSION_COOKIE_NAME
} from "./middleware.js";
import {
  createStaffUser,
  listUsers,
  loginWithPassword,
  registerBuyer,
  requestOtp,
  revokeSession,
  updateUserStatus,
  verifyOtp
} from "./service.js";
import {
  createUserSchema,
  listUsersQuerySchema,
  loginWithPasswordSchema,
  registerBuyerSchema,
  requestOtpSchema,
  updateUserStatusSchema,
  verifyOtpSchema
} from "./schemas.js";
import type { SmsSender } from "./types.js";

const SESSION_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
  message: { error: "Too many attempts. Please try again later.", code: "RATE_LIMITED" }
});

export function createAuthRouter(sender: SmsSender): Router {
  const router = Router();

  // 1. Password-based login (for Owner, Sales Manager, Accountant, Buyer)
  router.post("/login", requireTrustedOrigin, authRateLimiter, async (request, response) => {
    const parsed = loginWithPasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new AuthError("Enter a valid email or phone number and password.", 400, "INVALID_INPUT");
    }

    const result = await loginWithPassword(parsed.data.identifier, parsed.data.password);
    response.cookie(SESSION_COOKIE_NAME, result.sessionToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api",
      maxAge: SESSION_COOKIE_MAX_AGE
    });
    response.status(200).json({ user: result.user, csrfToken: result.csrfToken });
  });

  // 2. Buyer Registration (requires phone number)
  router.post("/register-buyer", requireTrustedOrigin, authRateLimiter, async (request, response) => {
    const parsed = registerBuyerSchema.safeParse(request.body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message || "Invalid registration details.";
      throw new AuthError(firstIssue, 400, "INVALID_INPUT");
    }

    const result = await registerBuyer(parsed.data);
    response.cookie(SESSION_COOKIE_NAME, result.sessionToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api",
      maxAge: SESSION_COOKIE_MAX_AGE
    });
    response.status(201).json({ user: result.user, csrfToken: result.csrfToken });
  });

  // 3. Phone OTP support (kept for backward compatibility or optional verification)
  router.post("/otp/request", requireTrustedOrigin, authRateLimiter, async (request, response) => {
    const parsed = requestOtpSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new AuthError("Enter a valid phone number.", 400, "INVALID_INPUT");
    }

    response.status(202).json(await requestOtp(parsed.data.phone, sender));
  });

  router.post("/otp/verify", requireTrustedOrigin, authRateLimiter, async (request, response) => {
    const parsed = verifyOtpSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new AuthError("Enter a valid phone number and six-digit code.", 400, "INVALID_INPUT");
    }

    const result = await verifyOtp(parsed.data.phone, parsed.data.code);
    response.cookie(SESSION_COOKIE_NAME, result.sessionToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api",
      maxAge: SESSION_COOKIE_MAX_AGE
    });
    response.status(200).json({ user: result.user, csrfToken: result.csrfToken });
  });

  // 4. Session inspection
  router.get("/me", requireAuth, (_request, response) => {
    const auth = authContext(response);
    response.json({ user: auth.user, csrfToken: auth.csrfToken });
  });

  // 5. Logout
  router.post("/logout", requireTrustedOrigin, requireAuth, requireCsrf, async (_request, response) => {
    const auth = authContext(response);
    await revokeSession(auth.sessionId);
    response.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api"
    });
    response.status(204).end();
  });

  // 6. User Management (staff creation)
  router.post(
    "/users",
    requireTrustedOrigin,
    requireAuth,
    requireCsrf,
    requireRoles("OWNER", "ADMIN"),
    async (request, response) => {
      const parsed = createUserSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new AuthError("Enter valid user details (role and name/email are required).", 400, "INVALID_INPUT");
      }

      response.status(201).json({
        user: await createStaffUser(parsed.data, authContext(response).user.id)
      });
    }
  );

  router.get("/users", requireAuth, requireRoles("OWNER", "ADMIN", "SALES", "ACCOUNTANT"), async (request, response) => {
    const parsed = listUsersQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw new AuthError("Pagination parameters are invalid.", 400, "INVALID_INPUT");
    }

    response.json(await listUsers(parsed.data.page, parsed.data.pageSize, parsed.data.role));
  });

  router.patch(
    "/users/:userId/status",
    requireTrustedOrigin,
    requireAuth,
    requireCsrf,
    requireRoles("OWNER", "ADMIN"),
    async (request, response) => {
      const parsed = updateUserStatusSchema.safeParse(request.body);
      const userId = request.params.userId;
      if (!parsed.success || typeof userId !== "string" || !/^[a-f\d]{24}$/i.test(userId)) {
        throw new AuthError("The user status request is invalid.", 400, "INVALID_INPUT");
      }

      const auth = authContext(response);
      response.json({
        user: await updateUserStatus(userId, parsed.data.status, auth.user.id)
      });
    }
  );

  return router;
}

export function errorResponse(error: unknown): { status: number; body: { error: string; code: string } } {
  if (error instanceof AuthError) {
    return {
      status: error.statusCode,
      body: { error: error.message, code: error.code }
    };
  }
  if (error instanceof InvalidPhoneNumberError) {
    return {
      status: 400,
      body: { error: error.message, code: "INVALID_PHONE" }
    };
  }
  if (error instanceof SmsDeliveryError) {
    return {
      status: 503,
      body: { error: "SMS delivery is temporarily unavailable.", code: "SMS_DELIVERY_FAILED" }
    };
  }
  if (error instanceof SyntaxError && "status" in error && error.status === 400) {
    return {
      status: 400,
      body: { error: "Request body must contain valid JSON.", code: "INVALID_JSON" }
    };
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 413
  ) {
    return {
      status: 413,
      body: { error: "Request body is too large.", code: "PAYLOAD_TOO_LARGE" }
    };
  }
  return {
    status: 500,
    body: { error: "An unexpected server error occurred.", code: "INTERNAL_ERROR" }
  };
}
