import axios from "axios";
import { prisma } from "../../../lib/db.js";
import type { z } from "zod";
import type { SendMessageBodySchema } from "./chat.schema.js";

export type SendMessageInput = z.infer<typeof SendMessageBodySchema>;

export interface AiServiceResponse {
  session_id: string;
  message: string;
  intent?: string;
  data?: unknown;
}

export const sendMessage = async (
  input: SendMessageInput,
  userId: string,
  authToken?: string,
): Promise<AiServiceResponse> => {
  const aiServiceUrl = process.env.AI_SERVICE_URL ?? "http://localhost:8000";

  let aiResponse: AiServiceResponse;
  try {
    const { data } = await axios.post<AiServiceResponse>(
      `${aiServiceUrl}/chat`,
      {
        user_id: userId,
        session_id: input.sessionId,
        message: input.message,
        history: input.history,
      },
      authToken ? { headers: { Authorization: `Bearer ${authToken}` } } : undefined,
    );
    aiResponse = data;
  } catch (e: unknown) {
    const axiosErr = e as { response?: { status: number; data: unknown }; message?: string };
    if (axiosErr.response) {
      console.error("[chat] AI service HTTP error:", axiosErr.response.status, JSON.stringify(axiosErr.response.data));
    } else {
      console.error("[chat] AI service call failed:", axiosErr.message);
    }
    const err = new Error("AI service unavailable") as Error & { status: number };
    err.status = 502;
    throw err;
  }

  const updatedMessages = [
    ...input.history,
    { role: "user" as const, content: input.message },
    { role: "assistant" as const, content: aiResponse.message },
  ];

  await prisma.chatSession.upsert({
    where: { id: input.sessionId },
    create: { id: input.sessionId, userId, messages: updatedMessages },
    update: { messages: updatedMessages },
  });

  return aiResponse;
};

export const getHistory = async (userId: string) => {
  return prisma.chatSession.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: {
      id: true,
      messages: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

export const clearSession = async (
  sessionId: string,
  userId: string,
): Promise<void> => {
  await prisma.chatSession.delete({
    where: { id: sessionId, userId },
  });
};
