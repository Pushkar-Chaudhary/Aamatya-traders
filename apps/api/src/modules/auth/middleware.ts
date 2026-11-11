import type { Request, RequestHandler, Response } from "express";
import { env } from "../../config/env.js";
import { AuthError } from "./errors.js";
import { findSession } from "./service.js";
import { safeEqual } from "./security.js";
import type { AuthContext, UserRole } from "./types.js";

export const SESSION_COOKIE_NAME = "amatya_session";

export function requireTrustedOrigin(request: Request, _response: Response, next: (error?: unknown) => void): void {
  // In development, allow requests with no origin (same-origin via Vite proxy, curl, Postman)
  // and also allow localhost origins regardless of port to support any dev setup.
  if (env.NODE_ENV === "development") {
    const origin = request.get("origin");
    if (!origin || origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1")) {
      next();
      return;
    }
  }

  if (request.get("origin") !== env.WEB_ORIGIN) {
    next(new AuthError("Request origin is not allowed.", 403, "ORIGIN_NOT_ALLOWED"));
    return;
  }
  next();
}

export const requireAuth: RequestHandler = async (request, response, next) => {
  const token = request.cookies?.[SESSION_COOKIE_NAME];
  if (typeof token !== "string" || token.length === 0) {
    next(new AuthError("Authentication is required.", 401, "UNAUTHENTICATED"));
    return;
  }

  const session = await findSession(token);
  if (!session) {
    next(new AuthError("Authentication is required.", 401, "UNAUTHENTICATED"));
    return;
  }

  response.locals.auth = session satisfies AuthContext;
  next();
};

export function requireCsrf(request: Request, response: Response, next: (error?: unknown) => void): void {
  const auth = response.locals.auth as AuthContext | undefined;
  const supplied = request.get("x-csrf-token");

  if (!auth || !supplied || !safeEqual(auth.csrfToken, supplied)) {
    next(new AuthError("A valid CSRF token is required.", 403, "CSRF_INVALID"));
    return;
  }
  next();
}

export function requireRoles(...roles: UserRole[]): RequestHandler {
  return (_request, response, next) => {
    const auth = response.locals.auth as AuthContext | undefined;
    if (!auth || !roles.includes(auth.user.role)) {
      next(new AuthError("You do not have permission to perform this action.", 403, "FORBIDDEN"));
      return;
    }
    next();
  };
}

export function authContext(response: Response): AuthContext {
  const auth = response.locals.auth as AuthContext | undefined;
  if (!auth) {
    throw new AuthError("Authentication is required.", 401, "UNAUTHENTICATED");
  }
  return auth;
}
