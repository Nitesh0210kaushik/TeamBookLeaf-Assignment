import type { Request, Response } from "express";
import { realtimeService } from "../services/realtime.service";

export const streamEvents = (req: Request, res: Response) => {
  realtimeService.subscribe(req, res, req.user!);
};
