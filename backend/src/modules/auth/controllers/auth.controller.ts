import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../../constants/http";
import { apiResponse } from "../../../utils/ApiResponse";
import { catchAsync } from "../../../utils/catchAsync";
import { authService } from "../services/auth.service";
import { clearAuthCookie, setAuthCookie } from "../utils/auth.cookies";

export const login = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.login(req.body);
  setAuthCookie(res, result.accessToken);
  res.status(HTTP_STATUS.OK).json(apiResponse("Login successful.", result));
});

export const logout = catchAsync(async (_req: Request, res: Response) => {
  clearAuthCookie(res);
  res.status(HTTP_STATUS.OK).json(apiResponse("Logged out.", null));
});

export const getMe = catchAsync(async (req: Request, res: Response) => {
  const user = await authService.getCurrentUser(req.user!.id);
  res.status(HTTP_STATUS.OK).json(apiResponse("Current user loaded.", { user }));
});
