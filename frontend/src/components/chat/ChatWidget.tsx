"use client";

import { useEffect, useRef, useState } from "react";
import { UtensilsCrossed, X, RotateCcw } from "lucide-react";
import { useChat } from "@/hooks/useChat";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";

const SUGGESTED = [
  "Find me a restaurant for tonight",
  "Recommend a romantic spot",
  "Book a table for 2 at 7pm",
];

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const { messages, loading, sendMessage, clearMessages } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // "Book via AI" buttons elsewhere dispatch this event to open the panel
  useEffect(() => {
    const handler = (e: Event) => {
      const msg = (e as CustomEvent<{ message: string }>).detail?.message;
      setOpen(true);
      if (msg) setTimeout(() => sendMessage(msg), 120);
    };
    window.addEventListener("open-chat-widget", handler);
    return () => window.removeEventListener("open-chat-widget", handler);
  }, [sendMessage]);

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-full bg-primary text-primary-foreground px-5 py-3.5 shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105 active:scale-95 transition-all duration-200"
        aria-label={open ? "Close chat" : "Open chat"}
      >
        <UtensilsCrossed className="h-5 w-5" />
        <span className="text-sm font-semibold">{open ? "Close" : "Chat"}</span>
      </button>

      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-in side panel */}
      <div
        className={`fixed right-0 top-0 z-40 h-full w-full max-w-[400px] flex flex-col bg-background border-l shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b bg-card px-4 py-3 shrink-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <UtensilsCrossed className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight">AI Dining Assistant</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span className="text-[10px] text-muted-foreground">Always online</span>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              title="New conversation"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-2">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                <UtensilsCrossed className="h-7 w-7 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-sm">What can I help you find?</p>
                <p className="text-xs text-muted-foreground">
                  Discover restaurants, get recommendations, or book a table.
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full">
                {SUGGESTED.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="rounded-xl border bg-card px-3 py-2.5 text-xs text-left hover:bg-muted transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} onSend={sendMessage} />
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
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t bg-background/95 backdrop-blur px-4 py-3 shrink-0">
          <ChatInput onSend={sendMessage} disabled={loading} />
        </div>
      </div>
    </>
  );
}
