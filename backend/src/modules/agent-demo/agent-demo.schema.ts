import { z } from "zod";

const DemoChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

export const DemoChatBodySchema = z.object({
  message: z.string().min(1).max(2000),
  sessionId: z.string().min(1),
  history: z.array(DemoChatMessageSchema).default([]),
});
