import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { env } from "./config/env.js";
import { isMongoConnected } from "./database/mongo.js";
import { errorResponse, createAuthRouter } from "./modules/auth/routes.js";
import { SparrowSmsSender } from "./modules/auth/sparrow-sms.js";
import type { SmsSender } from "./modules/auth/types.js";
import { productsRouter } from "./modules/products/routes.js";
import { financialRouter } from "./modules/financial/routes.js";
import { ordersRouter } from "./modules/orders/routes.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const webDist = resolve(currentDirectory, "../../web/dist");
const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (request) => request.path === "/health",
  message: { error: "Too many requests. Please try again later.", code: "RATE_LIMITED" }
});

export function createApp(sender: SmsSender = new SparrowSmsSender()): express.Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(
    helmet({
      contentSecurityPolicy: false // Allow modern frontend scripts & icons
    })
  );
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use("/api", apiRateLimiter);
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.get("/api/health", (_request, response) => {
    const databaseConnected = isMongoConnected();

    response.status(databaseConnected ? 200 : 503).json({
      status: databaseConnected ? "ok" : "degraded",
      service: "amatya-api",
      database: databaseConnected ? "connected" : "disconnected"
    });
  });

  app.use("/api/auth", createAuthRouter(sender));
  app.use("/api/products", productsRouter);
  app.use("/api/financial", financialRouter);
  app.use("/api/orders", ordersRouter);

  // Serve static frontend build in production if available
  if (existsSync(webDist)) {
    app.use(express.static(webDist));
    app.get(/^(?!\/api).*/, (_request, response) => {
      response.sendFile(resolve(webDist, "index.html"));
    });
  }

  app.use((_request, response) => {
    response.status(404).json({ error: "Route not found.", code: "NOT_FOUND" });
  });

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    const result = errorResponse(error);
    if (result.status === 500) {
      console.error("Unhandled API error:", error instanceof Error ? error.name : "UnknownError");
    }
    response.status(result.status).json(result.body);
  });

  return app;
}

export const app = createApp();
