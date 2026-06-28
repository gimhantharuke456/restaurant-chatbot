import type { Request, Response } from "express";
import type { AuthRequest } from "../../types/index.js";
import * as chatService from "./chat.service.js";

export const sendMessage = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const authToken = req.headers.authorization?.split("Bearer ")[1];
  const result = await chatService.sendMessage(
    req.body as chatService.SendMessageInput,
    req.user!.dbId,
    authToken,
  );
  res.json(result);
};

export const getHistory = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const sessions = await chatService.getHistory(req.user!.dbId);
  res.json(sessions);
};

export const clearSession = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  await chatService.clearSession(req.params.id, req.user!.dbId);
  res.json({ success: true });
};

export const sendGuestMessage = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const result = await chatService.sendGuestMessage(req.body as chatService.SendMessageInput);
  res.json(result);
};
