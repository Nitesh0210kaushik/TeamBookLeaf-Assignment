import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../../constants/http";
import { apiResponse } from "../../../utils/ApiResponse";
import { catchAsync } from "../../../utils/catchAsync";
import { adminDashboardService } from "../services/admin-dashboard.service";

export const getStats = catchAsync(async (req: Request, res: Response) => {
  const stats = await adminDashboardService.getStats(req.user!.id);
  res.status(HTTP_STATUS.OK).json(apiResponse("Dashboard stats loaded.", stats));
});

export const listTeam = catchAsync(async (_req: Request, res: Response) => {
  const team = await adminDashboardService.listTeam();
  res.status(HTTP_STATUS.OK).json(apiResponse("Team loaded.", { team }));
});
