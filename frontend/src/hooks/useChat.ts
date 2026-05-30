"use client";

import { useState, useCallback, useRef } from "react";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

function uid() {
  return Math.random().toString(36).slice(2);
}

export function useChat(sessionId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const historyRef = useRef<{ role: string; content: string }[]>([]);

  const sendMessage = useCallback(async (content: string) => {
    const userMsg: Message = { id: uid(), role: "user", content, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const history = [...historyRef.current];
    historyRef.current = [...history, { role: "user", content }];

    try {
      const res = await fetch("/api/proxy/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, sessionId, history }),
      });

      if (!res.ok) throw new Error("Request failed");
      const data = await res.json() as { message: string };

      const aiMsg: Message = { id: uid(), role: "assistant", content: data.message, timestamp: new Date() };
      setMessages(prev => [...prev, aiMsg]);
      historyRef.current = [...historyRef.current, { role: "assistant", content: data.message }];
    } catch {
      const errMsg: Message = {
        id: uid(),
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    historyRef.current = [];
  }, []);

  return { messages, loading, sendMessage, clearMessages };
}
