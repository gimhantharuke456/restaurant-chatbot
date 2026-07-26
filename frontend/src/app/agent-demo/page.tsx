"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot,
  Compass,
  Sparkles,
  CalendarCheck,
  CreditCard,
  MessageCircle,
  Send,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TraceStep {
  step: string;
  label: string;
  latencyMs?: number;
  [key: string]: unknown;
}

interface DemoMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  intent?: string;
  trace?: TraceStep[];
  data?: { name?: string }[] | null;
}

interface DemoChatResponse {
  session_id: string;
  message: string;
  intent?: string;
  data?: { name?: string }[] | null;
  trace?: TraceStep[];
}

function uid() {
  return Math.random().toString(36).slice(2);
}

// ── Static config ─────────────────────────────────────────────────────────────

const AGENT_NODES: { key: string; label: string; icon: typeof Compass }[] = [
  { key: "SEARCH", label: "Discovery", icon: Compass },
  { key: "RECOMMEND", label: "Recommendation", icon: Sparkles },
  { key: "RESERVE", label: "Reservation", icon: CalendarCheck },
  { key: "PAYMENT", label: "Payment", icon: CreditCard },
  { key: "GENERAL", label: "General", icon: MessageCircle },
];

const STEP_STYLES: Record<string, string> = {
  orchestrator: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  routing: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  tool_call: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  extraction: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  backend_call: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  llm_call: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  auth_check: "bg-red-500/10 text-red-600 dark:text-red-400",
  agent_complete: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
};

const SUGGESTIONS = [
  "Find me a seafood restaurant in Colombo",
  "What do you recommend for a date night?",
  "Book a table for 4 tomorrow at 7pm at Ministry of Crab",
  "How do payments work on this platform?",
];

export default function AgentDemoPage() {
  const [sessionId] = useState(uid);
  const [messages, setMessages] = useState<DemoMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeIntent, setActiveIntent] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      setMessages((prev) => [...prev, { id: uid(), role: "user", content: text }]);
      setInput("");
      setLoading(true);
      setActiveIntent(null);

      try {
        const res = await fetch("/api/proxy/agent-demo/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, sessionId, history }),
        });
        const data = (await res.json()) as DemoChatResponse;
        const content =
          data.message === "__RESTAURANT_LIST__"
            ? `Found ${data.data?.length ?? 0} matching restaurants (shown below).`
            : data.message;

        setMessages((prev) => [
          ...prev,
          { id: uid(), role: "assistant", content, intent: data.intent, trace: data.trace, data: data.data },
        ]);
        setActiveIntent(data.intent ?? null);
      } catch {
        setMessages((prev) => [
          ...prev,
          { id: uid(), role: "assistant", content: "Sorry, the AI service is unreachable right now." },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, sessionId]
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <header className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Bot className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-semibold">Multi-Agent Workflow Demo</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Live view of the orchestrator classifying intent and routing to a specialist agent for every
            message sent below. No login required — reservation/payment actions will show their real
            &quot;sign-in required&quot; branch rather than mutating any data.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
          {/* ── Chat panel ──────────────────────────────────────────────── */}
          <Card className="p-0 overflow-hidden h-[560px] flex flex-col">
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.length === 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Try one of these:</p>
                  {SUGGESTIONS.map((s) => (
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
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[90%] space-y-1.5">
                    <div
                      className={`rounded-2xl px-3 py-2 text-sm ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      }`}
                    >
                      {m.content}
                    </div>
                    {m.role === "assistant" && m.data && m.data.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {m.data.slice(0, 6).map((r, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">
                            {r.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {m.role === "assistant" && m.intent && (
                      <Badge variant="outline" className="text-[10px]">
                        intent: {m.intent}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-2.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Running pipeline…
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            <div className="border-t px-3 py-2 flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask the agent…"
                className="flex-1 h-9 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                disabled={loading}
              />
              <Button size="icon" className="h-9 w-9 shrink-0" onClick={() => send(input)} disabled={!input.trim() || loading}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </Card>

          {/* ── Pipeline visualization ──────────────────────────────────── */}
          <div className="space-y-4">
            <Card className="p-5 space-y-4">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 transition-all ${
                    loading ? "ring-2 ring-violet-500/60 bg-violet-500/5" : "bg-card"
                  }`}
                >
                  <Bot className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  <span className="text-sm font-medium">Orchestrator</span>
                  <span className="text-xs text-muted-foreground">(intent classification)</span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 w-full">
                  {AGENT_NODES.map(({ key, label, icon: Icon }) => {
                    const active = activeIntent === key;
                    return (
                      <div
                        key={key}
                        className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center transition-all duration-300 ${
                          active
                            ? "border-primary bg-primary/10 ring-2 ring-primary/40 scale-105"
                            : "border-border bg-card"
                        }`}
                      >
                        <Icon className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                        <span className={`text-[11px] font-medium ${active ? "text-primary" : "text-foreground"}`}>
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="text-sm font-semibold mb-3">
                Execution Trace
                {lastAssistant?.trace && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    ({lastAssistant.trace.length} steps · last message)
                  </span>
                )}
              </h2>
              {!lastAssistant?.trace || lastAssistant.trace.length === 0 ? (
                <p className="text-sm text-muted-foreground">Send a message to see the pipeline trace.</p>
              ) : (
                <ol className="space-y-2">
                  {lastAssistant.trace.map((step, i) => (
                    <li key={i} className="rounded-lg border bg-card/50 px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs text-muted-foreground shrink-0">{i + 1}.</span>
                          <span
                            className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                              STEP_STYLES[step.step] ?? "bg-muted text-muted-foreground"
                            }`}
                          >
                            {step.step}
                          </span>
                          <span className="text-sm font-medium truncate">{step.label}</span>
                        </div>
                        {typeof step.latencyMs === "number" && (
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {step.latencyMs} ms
                          </Badge>
                        )}
                      </div>
                      <StepDetails step={step} />
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepDetails({ step }: { step: TraceStep }) {
  const entries = Object.entries(step).filter(([k]) => !["step", "label", "latencyMs"].includes(k));
  if (entries.length === 0) return null;
  return (
    <details className="mt-1.5 group/details">
      <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground">
        details
      </summary>
      <pre className="mt-1 max-h-40 overflow-auto rounded-md bg-muted/50 p-2 text-[11px] whitespace-pre-wrap break-words">
        {JSON.stringify(Object.fromEntries(entries), null, 2)}
      </pre>
    </details>
  );
}
