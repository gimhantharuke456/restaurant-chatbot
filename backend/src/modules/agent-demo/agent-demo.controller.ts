import type { Request, Response } from "express";
import * as agentDemoService from "./agent-demo.service.js";

export const postMessage = async (req: Request, res: Response): Promise<void> => {
  const result = await agentDemoService.sendDemoMessage(req.body as agentDemoService.DemoChatInput);
  res.json(result);
};
