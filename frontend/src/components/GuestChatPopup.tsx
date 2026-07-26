"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, X, Send, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resolveLocation } from "@/lib/geolocation";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function uid() {
  return crypto.randomUUID();
}

export function GuestChatPopup() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(uid);
  const historyRef = useRef<{ role: string; content: string }[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: uid(), role: "user", content: text };
    setMessages((p) => [...p, userMsg]);
    setInput("");
    setLoading(true);

    const history = [...historyRef.current];
    historyRef.current = [...history, { role: "user", content: text }];

    try {
      const location = await resolveLocation();
      const res = await fetch("/api/proxy/chat/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId, history, ...(location ?? {}) }),
      });
      const data = await res.json() as { message: string };
      let reply = data.message;
      if (data.message === "__RESTAURANT_LIST__") {
        reply = "Here are some restaurants I found for you! Sign in to see full details and book a table.";
      } else if (data.message === "__MENU_LIST__") {
        reply = "Here's their menu! Sign in to order and book a table.";
      }
      setMessages((p) => [...p, { id: uid(), role: "assistant", content: reply }]);
      historyRef.current = [...historyRef.current, { role: "assistant", content: reply }];
    } catch {
      setMessages((p) => [...p, { id: uid(), role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }, [loading, sessionId]);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40 hover:shadow-primary/60 hover:scale-105 transition-all duration-200"
        aria-label="Open chat"
      >
        {open ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </button>

      {/* Popup */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 rounded-2xl border bg-background shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: "520px" }}>
          {/* Header */}
          <div className="flex items-center gap-2 border-b px-4 py-3 bg-card">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <UtensilsCrossed className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">AI Dining Assistant</p>
              <p className="text-xs text-muted-foreground">Ask me about restaurants</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-6 space-y-3">
                <p className="text-sm text-muted-foreground">Hi! I can help you discover restaurants. What are you craving?</p>
                {["Find a seafood restaurant", "Recommend for a date night", "Best budget dining"].map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="block w-full text-left rounded-xl border bg-card px-3 py-2 text-xs hover:bg-muted transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-2.5 flex gap-1">
                  {[0, 150, 300].map((d) => (
                    <span key={d} className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t px-3 py-2 flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about restaurants…"
              className="flex-1 h-9 text-sm"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              disabled={loading}
            />
            <Button size="icon" className="h-9 w-9 shrink-0" onClick={() => send(input)} disabled={!input.trim() || loading}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
