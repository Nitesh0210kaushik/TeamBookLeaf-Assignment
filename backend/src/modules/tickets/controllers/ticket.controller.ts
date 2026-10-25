import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../../constants/http";
import { apiResponse } from "../../../utils/ApiResponse";
import { catchAsync } from "../../../utils/catchAsync";
import { ticketAiService } from "../services/ticket-ai.service";
import { ticketManagementService } from "../services/ticket-management.service";
import { ticketService } from "../services/ticket.service";
import type { ListTicketsQuery } from "../validations/ticket.validation";

export const createTicket = catchAsync(async (req: Request, res: Response) => {
  const ticket = await ticketService.createTicket(
    req.user!,
    req.body,
    req.files as Express.Multer.File[] | undefined,
  );
  res
    .status(HTTP_STATUS.CREATED)
    .json(apiResponse("Ticket submitted. Our team will get back to you soon.", { ticket }));
});

export const listTickets = catchAsync(async (req: Request, res: Response) => {
  const result = await ticketService.listTickets(
    req.user!,
    req.query as unknown as ListTicketsQuery,
  );
  res.status(HTTP_STATUS.OK).json(apiResponse("Tickets loaded.", result));
});

export const getTicket = catchAsync(async (req: Request, res: Response) => {
  const ticket = await ticketService.getTicketDetail(req.user!, req.params.ticketId);
  res.status(HTTP_STATUS.OK).json(apiResponse("Ticket loaded.", { ticket }));
});

export const addMessage = catchAsync(async (req: Request, res: Response) => {
  const ticket = await ticketService.addMessage(
    req.user!,
    req.params.ticketId,
    req.body,
    req.files as Express.Multer.File[] | undefined,
  );
  res.status(HTTP_STATUS.CREATED).json(apiResponse("Message sent.", { ticket }));
});

export const updateTicket = catchAsync(async (req: Request, res: Response) => {
  const ticket = await ticketManagementService.updateTicket(
    req.user!,
    req.params.ticketId,
    req.body,
  );
  res.status(HTTP_STATUS.OK).json(apiResponse("Ticket updated.", { ticket }));
});

export const addNote = catchAsync(async (req: Request, res: Response) => {
  const ticket = await ticketManagementService.addNote(req.user!, req.params.ticketId, req.body);
  res.status(HTTP_STATUS.CREATED).json(apiResponse("Internal note added.", { ticket }));
});

export const getDraft = catchAsync(async (req: Request, res: Response) => {
  const result = await ticketAiService.getDraft(req.params.ticketId, req.user!.id, {
    force: false,
  });
  res.status(HTTP_STATUS.OK).json(apiResponse("Draft ready.", result));
});

export const regenerateDraft = catchAsync(async (req: Request, res: Response) => {
  const result = await ticketAiService.getDraft(req.params.ticketId, req.user!.id, { force: true });
  res.status(HTTP_STATUS.CREATED).json(apiResponse("Draft regenerated.", result));
});

export const rerunTriage = catchAsync(async (req: Request, res: Response) => {
  await ticketAiService.runTriage(req.params.ticketId, req.user!.id);
  const ticket = await ticketService.getTicketDetail(req.user!, req.params.ticketId);
  res.status(HTTP_STATUS.OK).json(apiResponse("Ticket re-classified.", { ticket }));
});
