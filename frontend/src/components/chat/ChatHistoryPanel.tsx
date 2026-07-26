"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, MessageSquare, Trash2, Loader2 } from "lucide-react";
import type { ChatSessionSummary } from "@/hooks/useChat";

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

export function ChatHistoryPanel({
  onClose,
  onResume,
  className,
}: {
  onClose: () => void;
  onResume: (session: ChatSessionSummary) => void;
  className?: string;
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
    <div className={`flex flex-col ${className ?? ""}`}>
      <div className="flex items-center gap-2 border-b bg-card px-4 py-3 shrink-0">
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
        <p className="text-sm font-semibold text-foreground">Chat History</p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {loading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center text-muted-foreground">
            <MessageSquare className="h-8 w-8" />
            <p className="text-xs">No past conversations yet</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => onResume(s)}
                className="w-full text-left rounded-xl border border-border bg-card px-3 py-2.5 hover:border-primary/40 hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-foreground leading-tight truncate">
                    {s.title ?? "New conversation"}
                  </p>
                  <button
                    onClick={(e) => remove(s.id, e)}
                    disabled={deletingId === s.id}
                    className="shrink-0 flex h-5 w-5 items-center justify-center rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all disabled:opacity-50"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{relativeTime(s.updatedAt)}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
