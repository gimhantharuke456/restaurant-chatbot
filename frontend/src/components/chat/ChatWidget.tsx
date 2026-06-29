"use client";

import { useState, useEffect, useRef } from "react";
import { useChat } from "@/hooks/useChat";
import { MessageBubble } from "./MessageBubble";
import { UtensilsCrossed, X, Minus, Send, RotateCcw } from "lucide-react";

const SUGGESTED = [
  "Find a good seafood restaurant",
  "Recommend for a date night",
  "Book a table for 2 tonight",
  "What's open near Colombo?",
];

function uid() {
  return crypto.randomUUID();
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [minimised, setMinimised] = useState(false);
  const [sessionId] = useState(uid);
  const { messages, loading, sendMessage, clearMessages } = useChat(sessionId);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && !minimised) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, open, minimised]);

  // Listen for programmatic open requests (e.g. from "Book via AI" buttons)
  useEffect(() => {
    const handler = (e: Event) => {
      const msg = (e as CustomEvent<{ message: string }>).detail?.message;
      setMinimised(false);
      setOpen(true);
      if (msg) {
        // Small delay so the panel has time to render before sending
        setTimeout(() => sendMessage(msg), 150);
      }
    };
    window.addEventListener("open-chat-widget", handler);
    return () => window.removeEventListener("open-chat-widget", handler);
  }, [sendMessage]);

  useEffect(() => {
    if (open && !minimised) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open, minimised]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    sendMessage(text);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggle = () => {
    if (minimised) { setMinimised(false); return; }
    setOpen((v) => !v);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">

      {/* ── Expanded chat panel ──────────────────────────────────────── */}
      {open && (
        <div
          className={`
            flex flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl shadow-black/20
            transition-all duration-300 ease-out
            ${minimised
              ? "h-0 opacity-0 pointer-events-none"
              : "opacity-100"
            }
          `}
          style={{ width: "360px", height: minimised ? 0 : "520px" }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b bg-card px-4 py-3 shrink-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <UtensilsCrossed className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground leading-tight">AI Dining Assistant</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <span className="text-[10px] text-muted-foreground">Always online</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={() => clearMessages()}
                  title="New conversation"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => setMinimised(true)}
                title="Minimise"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setOpen(false)}
                title="Close"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-5 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <UtensilsCrossed className="h-7 w-7 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">What can I help you with?</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Discover restaurants, get recommendations, or book a table.
                  </p>
                </div>
                <div className="w-full space-y-1.5">
                  {SUGGESTED.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="w-full text-left rounded-xl border bg-card px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground hover:border-primary/30 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
                {loading && (
                  <div className="flex gap-3 items-end">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                      AI
                    </div>
                    <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5">
                      {[0, 150, 300].map((d) => (
                        <span
                          key={d}
                          className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce"
                          style={{ animationDelay: `${d}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="border-t bg-card px-3 py-3 shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask about restaurants…"
                disabled={loading}
                rows={1}
                className="
                  flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2
                  text-sm placeholder:text-muted-foreground
                  focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                  disabled:opacity-50
                  min-h-[40px] max-h-28
                "
                style={{ lineHeight: "1.5" }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="
                  flex h-10 w-10 shrink-0 items-center justify-center rounded-xl
                  bg-primary text-primary-foreground
                  hover:bg-primary/90 active:scale-95
                  disabled:opacity-40 disabled:cursor-not-allowed
                  transition-all duration-150
                "
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-muted-foreground/60">
              AI may make mistakes · Always verify important info
            </p>
          </div>
        </div>
      )}

      {/* ── Trigger button ───────────────────────────────────────────── */}
      <button
        onClick={toggle}
        className={`
          group relative flex items-center gap-2.5
          rounded-full bg-primary text-primary-foreground
          shadow-lg shadow-primary/30
          hover:shadow-primary/50 hover:scale-105
          active:scale-95
          transition-all duration-200
          ${open && !minimised ? "px-4 py-3" : "px-5 py-3.5"}
        `}
        aria-label="Open chat"
      >
        {open && !minimised ? (
          <X className="h-5 w-5" />
        ) : (
          <>
            <UtensilsCrossed className="h-5 w-5" />
            <span className="text-sm font-semibold">Chat</span>
            {messages.length > 0 && minimised && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold">
                {messages.filter((m) => m.role === "assistant").length}
              </span>
            )}
          </>
        )}
      </button>

    </div>
  );
}
