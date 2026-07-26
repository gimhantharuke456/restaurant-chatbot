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
  guest_limit_reached?: boolean;
}

const GUEST_MESSAGE_LIMIT = 3;

const generateSessionTitle = async (userMessage: string, assistantMessage: string): Promise<string> => {
  const aiServiceUrl = process.env.AI_SERVICE_URL ?? "http://localhost:8000";
  try {
    const { data } = await axios.post<{ title: string }>(`${aiServiceUrl}/chat/title`, {
      user_message: userMessage,
      assistant_message: assistantMessage,
    });
    return data.title;
  } catch (e: unknown) {
    console.error("[chat] title generation failed (non-fatal):", e);
    return userMessage.slice(0, 60);
  }
};

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

  // A brand new session (empty history) is exactly the first user+assistant
  // exchange — generate its title from those two messages once, here, and
  // never touch it again on subsequent turns.
  const isNewSession = input.history.length === 0;
  const title = isNewSession ? await generateSessionTitle(input.message, aiResponse.message) : undefined;

  await prisma.chatSession.upsert({
    where: { id: input.sessionId },
    create: { id: input.sessionId, userId, messages: updatedMessages, title },
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
      title: true,
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

export const sendGuestMessage = async (input: SendMessageInput): Promise<AiServiceResponse> => {
  const guestSession = await prisma.guestSession.upsert({
    where: { sessionId: input.sessionId },
    create: { sessionId: input.sessionId, messageCount: 1 },
    update: { messageCount: { increment: 1 } },
  });

  if (guestSession.messageCount > GUEST_MESSAGE_LIMIT) {
    return {
      session_id: input.sessionId,
      message: "You've reached the free message limit. Please sign in or create an account to continue chatting.",
      intent: "AUTH_REQUIRED",
      guest_limit_reached: true,
    };
  }

  const aiServiceUrl = process.env.AI_SERVICE_URL ?? "http://localhost:8000";
  try {
    const { data } = await axios.post<AiServiceResponse>(`${aiServiceUrl}/chat`, {
      user_id: "",
      session_id: input.sessionId,
      message: input.message,
      history: input.history,
    });
    return data;
  } catch (e: unknown) {
    const axiosErr = e as { response?: { status: number; data: unknown }; message?: string };
    if (axiosErr.response) {
      console.error("[chat/guest] AI service HTTP error:", axiosErr.response.status, JSON.stringify(axiosErr.response.data));
    } else {
      console.error("[chat/guest] AI service call failed:", axiosErr.message);
    }
    const err = new Error("AI service unavailable") as Error & { status: number };
    err.status = 502;
    throw err;
  }
};
