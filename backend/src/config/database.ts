import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "./logger";

export async function connectDatabase(uri: string = env.MONGODB_URI) {
  mongoose.set("strictQuery", true);

  await mongoose.connect(uri, {
    autoIndex: env.NODE_ENV !== "production",
    serverSelectionTimeoutMS: 10_000,
  });

  logger.info({ db: mongoose.connection.name }, "MongoDB connected");
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
  logger.info("MongoDB disconnected");
}
