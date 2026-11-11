import mongoose from "mongoose";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { connectMongo } from "./database/mongo.js";
import { seedDefaultAccounts } from "./modules/auth/service.js";
import { seedSampleProducts } from "./modules/products/service.js";
import { seedSampleOrders } from "./modules/orders/service.js";
import { seedSampleFinancials } from "./modules/financial/service.js";

async function start(): Promise<void> {
  if (env.MONGODB_URI) {
    await connectMongo(env.MONGODB_URI);
    console.info("Connected to MongoDB.");

    console.info("Syncing account data...");
    await seedDefaultAccounts();

    if (env.NODE_ENV !== "production") {
      console.info("Syncing development sample data...");
      await seedSampleProducts();
      await seedSampleOrders();
      await seedSampleFinancials();
    }
    console.info("Account and sample data initialization complete.");
  } else {
    console.warn("MONGODB_URI is not set; API health will remain degraded.");
  }

  const host = env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1";
  const server = app.listen(env.PORT, host, () => {
    console.info(`Amatya Traders API listening on http://${host}:${env.PORT}`);
  });
  server.requestTimeout = 30_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5_000;
  server.maxRequestsPerSocket = 100;
}

start().catch(async (error: unknown) => {
  console.error("API startup failed:", error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
