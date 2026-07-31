"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useChat } from "@/hooks/useChat";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import type { ChatSessionSummary } from "@/hooks/useChat";
import {
  UtensilsCrossed,
  RotateCcw,
  MessageSquare,
  Trash2,
  Loader2,
  PanelLeftOpen,
  PanelLeftClose,
  Plus,
} from "lucide-react";

// ── Chat history sidebar ───────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function HistorySidebar({
  activeSessionId,
  onResume,
  onNew,
}: {
  activeSessionId: string;
  onResume: (s: ChatSessionSummary) => void;
  onNew: () => void;
}) {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/proxy/chat/history")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: ChatSessionSummary[]) => setSessions(data))
      .finally(() => setLoading(false));
  }, []);

  const remove = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    await fetch(`/api/proxy/chat/session/${id}`, { method: "DELETE" });
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setDeletingId(null);
  };

  return (
    <div className="flex h-full flex-col">
      {/* New chat button */}
      <div className="p-3 shrink-0">
        <button
          onClick={onNew}
          className="flex w-full items-center gap-2 rounded-xl border border-dashed border-border bg-card px-3 py-2.5 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New conversation
        </button>
      </div>

      <p className="px-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        History
      </p>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-center text-muted-foreground">
            <MessageSquare className="h-7 w-7" />
            <p className="text-xs">No past conversations yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {sessions.map((s) => {
              const isActive = s.id === activeSessionId;
              return (
                <button
                  key={s.id}
                  onClick={() => onResume(s)}
                  className={`group w-full text-left rounded-xl px-3 py-2.5 transition-colors ${
                    isActive
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted/60 border border-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <p className={`text-xs font-medium leading-tight truncate ${isActive ? "text-primary" : "text-foreground"}`}>
                      {s.title ?? "New conversation"}
                    </p>
                    <button
                      onClick={(e) => remove(s.id, e)}
                      disabled={deletingId === s.id}
                      className="shrink-0 flex h-4 w-4 items-center justify-center rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all disabled:opacity-50"
                    >
                      {deletingId === s.id
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <Trash2 className="h-3 w-3" />
                      }
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {relativeTime(s.updatedAt)}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Suggested prompts ──────────────────────────────────────────────────────────

const SUGGESTED = [
  "Find me a good seafood restaurant in Colombo",
  "Recommend a restaurant for a date night",
  "What Sri Lankan restaurants are open tonight?",
  "Book a table for 2 at 7pm tomorrow",
];

// ── Main ChatWindow ────────────────────────────────────────────────────────────

export function ChatWindow() {
  const { sessionId, messages, loading, sendMessage, clearMessages, resumeSession } = useChat();
  const [sidebarOpen, setSidebarOpen] = useState(true);
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

  const handleResume = (session: ChatSessionSummary) => {
    resumeSession(session);
    // On mobile, close sidebar after picking a session
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleNew = () => {
    clearMessages();
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left history sidebar ── */}
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          shrink-0 border-r bg-background transition-all duration-300 overflow-hidden z-20
          ${sidebarOpen ? "w-64" : "w-0"}
          md:relative md:z-auto
          max-md:fixed max-md:left-0 max-md:top-0 max-md:h-full
        `}
      >
        {sidebarOpen && (
          <HistorySidebar
            activeSessionId={sessionId}
            onResume={handleResume}
            onNew={handleNew}
          />
        )}
      </aside>

      {/* ── Chat panel ── */}
      <div className="relative flex flex-1 flex-col min-w-0">

        {/* Header */}
        <div className="flex items-center gap-3 border-b bg-card px-4 py-3 shrink-0">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            title={sidebarOpen ? "Hide history" : "Show history"}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </button>

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

          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              title="New conversation"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Messages area */}
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
                {SUGGESTED.map((s) => (
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
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} onSend={sendMessage} />
              ))}
              {loading && (
                <div className="flex gap-3 items-end">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                    AI
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5">
                    {[0, 150, 300].map((delay) => (
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

        {/* Input */}
        <div className="border-t bg-background/95 backdrop-blur px-4 py-3 shrink-0">
          <div className="max-w-2xl mx-auto">
            <ChatInput onSend={sendMessage} disabled={loading} />
          </div>
        </div>
      </div>
    </div>
  );
}
