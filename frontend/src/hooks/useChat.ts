"use client";

import { useState, useCallback, useRef } from "react";

export interface RestaurantResult {
  id: string;
  name: string;
  description?: string;
  address: string;
  area: string;
  cuisineTypes: string;
  priceRange: string;
  avgRating?: number;
  imageUrls: string;
}

export interface MenuItemResult {
  id: string;
  restaurantId: string;
  restaurantName: string;
  name: string;
  description?: string | null;
  price: number;
  category: string;
  dietaryInfo: string[];
  imageUrl?: string | null;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  data?: RestaurantResult[] | MenuItemResult[];
  timestamp: Date;
}

export interface ChatSessionSummary {
  id: string;
  title: string | null;
  messages: { role: string; content: string }[];
  createdAt: string;
  updatedAt: string;
}

const RESTAURANT_LIST_SENTINEL = "__RESTAURANT_LIST__";
const MENU_LIST_SENTINEL = "__MENU_LIST__";

function uid() {
  return Math.random().toString(36).slice(2);
}

// Persisted history only ever stores {role, content} — a resumed card-list
// turn has no data to re-render, so fall back to a plain description rather
// than showing the raw sentinel string.
function displayContentForResume(content: string): string {
  if (content === RESTAURANT_LIST_SENTINEL) return "(Showed restaurant recommendations)";
  if (content === MENU_LIST_SENTINEL) return "(Showed a restaurant's menu)";
  return content;
}

export function useChat() {
  const [sessionId, setSessionId] = useState(uid);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const historyRef = useRef<{ role: string; content: string }[]>([]);
  const sessionIdRef = useRef(sessionId);

  const sendMessage = useCallback(async (content: string) => {
    const activeSessionId = sessionIdRef.current;
    const userMsg: Message = { id: uid(), role: "user", content, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const history = [...historyRef.current];
    historyRef.current = [...history, { role: "user", content }];

    try {
      const res = await fetch("/api/proxy/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, sessionId: activeSessionId, history }),
      });

      if (!res.ok) throw new Error("Request failed");
      const data = await res.json() as { message: string; data?: RestaurantResult[] | MenuItemResult[] };

      const aiMsg: Message = {
        id: uid(),
        role: "assistant",
        content: data.message,
        data: data.data ?? undefined,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMsg]);

      // Store a meaningful summary in history so the AI remembers what was shown
      let historyContent = data.message;
      if (data.message === RESTAURANT_LIST_SENTINEL && data.data?.length) {
        const names = (data.data as RestaurantResult[]).map(r => r.name).join(", ");
        historyContent = `Here are the restaurants I found: ${names}`;
      } else if (data.message === MENU_LIST_SENTINEL && data.data?.length) {
        const items = data.data as MenuItemResult[];
        const names = items.map(i => i.name).join(", ");
        historyContent = `Here's ${items[0].restaurantName}'s menu: ${names}`;
      }
      historyRef.current = [...historyRef.current, { role: "assistant", content: historyContent }];
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
  }, []);

  // Starts a genuinely new conversation — a fresh sessionId so it becomes
  // its own row (and its own title) in chat history, rather than continuing
  // to append to whatever session was active before.
  const clearMessages = useCallback(() => {
    const next = uid();
    sessionIdRef.current = next;
    setSessionId(next);
    setMessages([]);
    historyRef.current = [];
  }, []);

  const resumeSession = useCallback((session: ChatSessionSummary) => {
    sessionIdRef.current = session.id;
    setSessionId(session.id);
    historyRef.current = session.messages.map(m => ({ role: m.role, content: m.content }));
    setMessages(
      session.messages.map(m => ({
        id: uid(),
        role: m.role === "user" ? "user" : "assistant",
        content: displayContentForResume(m.content),
        timestamp: new Date(),
      })),
    );
  }, []);

  return { sessionId, messages, loading, sendMessage, clearMessages, resumeSession };
}
