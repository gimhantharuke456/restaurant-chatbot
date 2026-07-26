import axios from "axios";
import type { z } from "zod";
import type { DemoChatBodySchema } from "./agent-demo.schema.js";

export type DemoChatInput = z.infer<typeof DemoChatBodySchema>;

export interface AgentDemoTraceStep {
  step: string;
  label: string;
  latencyMs?: number;
  [key: string]: unknown;
}

export interface AgentDemoResponse {
  session_id: string;
  message: string;
  intent?: string;
  data?: unknown;
  trace: AgentDemoTraceStep[];
}

export const sendDemoMessage = async (input: DemoChatInput): Promise<AgentDemoResponse> => {
  const aiServiceUrl = process.env.AI_SERVICE_URL ?? "http://localhost:8000";

  try {
    const { data } = await axios.post<AgentDemoResponse>(`${aiServiceUrl}/demo/chat`, {
      user_id: "",
      session_id: input.sessionId,
      message: input.message,
      history: input.history,
    });
    return { ...data, trace: data.trace ?? [] };
  } catch (e: unknown) {
    const axiosErr = e as { response?: { status: number; data: unknown }; message?: string };
    if (axiosErr.response) {
      console.error("[agent-demo] AI service HTTP error:", axiosErr.response.status, JSON.stringify(axiosErr.response.data));
    } else {
      console.error("[agent-demo] AI service call failed:", axiosErr.message);
    }
    const err = new Error("AI service unavailable") as Error & { status: number };
    err.status = 502;
    throw err;
  }
};
