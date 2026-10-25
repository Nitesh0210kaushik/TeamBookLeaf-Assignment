import type { Request, Response } from "express";
import mongoose from "mongoose";
import { HTTP_STATUS } from "../../../constants/http";
import { apiResponse } from "../../../utils/ApiResponse";
import { aiClient } from "../../ai/services/ai-client.service";

export const getHealth = (_req: Request, res: Response) => {
  const databaseUp = mongoose.connection.readyState === 1;

  res.status(databaseUp ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE).json(
    apiResponse(databaseUp ? "OK" : "Degraded", {
      status: databaseUp ? "ok" : "degraded",
      database: databaseUp ? "up" : "down",
      // The app is fully usable without AI, so AI state is reported but never fails the check.
      ai: aiClient.getStatus(),
      uptimeSeconds: Math.round(process.uptime()),
    }),
  );
};
