"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizontal, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Message { role: "user" | "assistant"; content: string; id: string }

const SUGGESTED = [
  "What were my best-performing menu items last month?",
  "When are my peak booking times?",
  "How can I improve my restaurant's rating?",
  "Summarize my reservation trends",
];

export function PortalAIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<{ role: string; content: string }[]>([]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((p) => [...p, userMsg]);
    setInput("");
    setLoading(true);
    const history = [...historyRef.current];
    historyRef.current = [...history, { role: "user", content: text }];
    try {
      const res = await fetch("/api/proxy/restaurant-portal/ai/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });
      const data = (await res.json()) as { message: string };
      const aiMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: data.message };
      setMessages((p) => [...p, aiMsg]);
      historyRef.current = [...historyRef.current, { role: "assistant", content: data.message }];
    } catch {
      setMessages((p) => [...p, { id: crypto.randomUUID(), role: "assistant", content: "Sorry, the AI service is unavailable." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center max-w-md mx-auto">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <Bot className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-lg">Restaurant AI Assistant</p>
              <p className="text-sm text-muted-foreground">Ask about your performance, trends, and how to improve your restaurant.</p>
            </div>
            <div className="grid gap-2 w-full">
              {SUGGESTED.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-xl border bg-card px-4 py-2.5 text-sm text-left hover:bg-muted transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-4">
            {messages.map((m) => (
              <div key={m.id} className={`flex gap-3 items-end ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {m.role === "user" ? "U" : "AI"}
                </div>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm whitespace-pre-wrap" : "bg-muted text-foreground rounded-bl-sm"}`}>
                  {m.role === "user" ? m.content : (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3 items-end">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">AI</div>
                <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5">
                  {[0, 150, 300].map((d) => <span key={d} className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
      <div className="border-t bg-background/95 backdrop-blur px-6 py-3">
        <div className="max-w-2xl mx-auto flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Ask about your restaurant performance…"
            disabled={loading}
            rows={1}
            className="min-h-[44px] max-h-32 resize-none flex-1"
          />
          <Button onClick={() => send(input)} disabled={loading || !input.trim()} size="icon" className="h-11 w-11 shrink-0">
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
