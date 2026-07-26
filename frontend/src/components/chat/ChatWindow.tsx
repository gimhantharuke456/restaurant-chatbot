"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useChat } from "@/hooks/useChat";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { ChatHistoryPanel } from "./ChatHistoryPanel";
import { UtensilsCrossed, History, RotateCcw } from "lucide-react";

const SUGGESTED = [
  "Find me a good seafood restaurant in Colombo",
  "Recommend a restaurant for a date night",
  "What Sri Lankan restaurants are open tonight?",
  "Book a table for 2 at 7pm tomorrow",
];

export function ChatWindow() {
  const { messages, loading, sendMessage, clearMessages, resumeSession } = useChat();
  const [historyOpen, setHistoryOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const prefill = searchParams.get("prefill");
    if (prefill) sendMessage(prefill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      {historyOpen && (
        <ChatHistoryPanel
          className="absolute inset-0 z-10 bg-background"
          onClose={() => setHistoryOpen(false)}
          onResume={(session) => { resumeSession(session); setHistoryOpen(false); }}
        />
      )}

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
        <button
          onClick={() => setHistoryOpen((v) => !v)}
          title="Chat history"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <History className="h-4 w-4" />
        </button>
        {messages.length > 0 && (
          <button
            onClick={() => { setHistoryOpen(false); clearMessages(); }}
            title="New conversation"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center max-w-md mx-auto">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <UtensilsCrossed className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-lg">What can I help you with?</p>
              <p className="text-sm text-muted-foreground">
                Discover restaurants, get personalised recommendations, or book a table.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 w-full">
              {SUGGESTED.map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="rounded-xl border bg-card px-4 py-2.5 text-sm text-left hover:bg-muted transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-4">
            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} onSend={sendMessage} />
            ))}

            {loading && (
              <div className="flex gap-3 items-end">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                  AI
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5">
                  {[0, 150, 300].map(delay => (
                    <span
                      key={delay}
                      className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="border-t bg-background/95 backdrop-blur px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <ChatInput onSend={sendMessage} disabled={loading} />
        </div>
      </div>
    </div>
  );
}
