"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot, Compass, Sparkles, CalendarCheck, CreditCard,
  MessageCircle, Send, ChevronDown, Loader2, MapPin,
  Star, Utensils, ArrowRight, UtensilsCrossed, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TraceStep {
  step: string;
  label: string;
  latencyMs?: number;
  [key: string]: unknown;
}

interface RestaurantResult {
  id: string;
  name: string;
  description?: string;
  address: string;
  area: string;
  cuisineTypes: string;
  priceRange: string;
  avgRating?: number;
}

interface DemoMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  intent?: string;
  trace?: TraceStep[];
  data?: RestaurantResult[] | null;
}

interface DemoChatResponse {
  session_id: string;
  message: string;
  intent?: string;
  data?: RestaurantResult[] | null;
  trace?: TraceStep[];
}

function uid() {
  return crypto.randomUUID();
}

// ── Static config ─────────────────────────────────────────────────────────────

const AGENT_NODES: { key: string; label: string; icon: typeof Compass }[] = [
  { key: "SEARCH",      label: "Discovery",      icon: Compass },
  { key: "RECOMMEND",   label: "Recommend",      icon: Sparkles },
  { key: "RESERVE",     label: "Reservation",    icon: CalendarCheck },
  { key: "PAYMENT",     label: "Payment",        icon: CreditCard },
  { key: "MENU",        label: "Menu",           icon: UtensilsCrossed },
  { key: "GENERAL",     label: "General",        icon: MessageCircle },
];

const STEP_STYLES: Record<string, string> = {
  orchestrator:   "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  routing:        "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  tool_call:      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  extraction:     "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  backend_call:   "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  llm_call:       "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  auth_check:     "bg-red-500/10 text-red-600 dark:text-red-400",
  agent_complete: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
};

const PRICE_LABEL: Record<string, string> = {
  BUDGET: "Budget", MODERATE: "Moderate", EXPENSIVE: "Expensive", FINE_DINING: "Fine Dining",
};

const SUGGESTIONS = [
  "Find me a seafood restaurant in Colombo",
  "What do you recommend for a date night?",
  "Book a table for 4 tomorrow at 7pm at Ministry of Crab",
  "Show me the menu for a Sri Lankan restaurant",
];

// ── Restaurant card (demo variant — links to restaurant page) ─────────────────

function DemoRestaurantCard({ r }: { r: RestaurantResult }) {
  let cuisines: string[] = [];
  try { cuisines = JSON.parse(r.cuisineTypes); } catch { cuisines = [r.cuisineTypes]; }

  return (
    <Link href={`/restaurants/${r.id}`} className="block group">
      <div className="rounded-xl border border-border bg-background/80 p-3 flex flex-col gap-1.5 hover:border-primary/40 hover:bg-muted/50 transition-colors">
        <div className="flex items-start justify-between gap-2">
          <span className="font-semibold text-xs text-foreground leading-tight group-hover:text-primary transition-colors">
            {r.name}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {r.avgRating != null && (
              <span className="flex items-center gap-0.5 text-[10px] text-primary">
                <Star className="h-2.5 w-2.5 fill-primary" />
                {r.avgRating.toFixed(1)}
              </span>
            )}
            <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <MapPin className="h-2.5 w-2.5 shrink-0" />
          <span>{r.area}</span>
          <span className="mx-1">·</span>
          <span>{PRICE_LABEL[r.priceRange] ?? r.priceRange}</span>
        </div>
        {cuisines.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <Utensils className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
            {cuisines.slice(0, 3).map((c) => (
              <span key={c} className="rounded-full bg-primary/10 text-primary text-[9px] px-1.5 py-0.5">{c}</span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

// ── Chat message renderer ──────────────────────────────────────────────────────

function DemoMessage({ m, onSend }: { m: DemoMessage; onSend: (t: string) => void }) {
  const isUser = m.role === "user";
  const isSentinel = m.content === "__RESTAURANT_LIST__";
  const hasCards = m.data && m.data.length > 0;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[92%] space-y-2">
        {/* Bubble — skip for pure sentinel messages */}
        {!isSentinel && (
          <div
            className={`rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
              isUser
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : "bg-muted text-foreground rounded-bl-sm"
            }`}
          >
            {m.content}
          </div>
        )}

        {/* Restaurant cards */}
        {!isUser && hasCards && (
          <div className="space-y-1.5">
            <p className="text-[10px] text-muted-foreground px-1">
              {m.data!.length} result{m.data!.length !== 1 ? "s" : ""} — click to view
            </p>
            {m.data!.map((r) => <DemoRestaurantCard key={r.id} r={r} />)}
          </div>
        )}

        {/* Intent badge */}
        {!isUser && m.intent && (
          <Badge variant="outline" className="text-[10px]">
            intent: {m.intent}
          </Badge>
        )}
      </div>
    </div>
  );
}

// ── Step details expander ──────────────────────────────────────────────────────

function StepDetails({ step }: { step: TraceStep }) {
  const entries = Object.entries(step).filter(([k]) => !["step", "label", "latencyMs"].includes(k));
  if (entries.length === 0) return null;
  return (
    <details className="mt-1.5">
      <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground">
        details
      </summary>
      <pre className="mt-1 max-h-40 overflow-auto rounded-md bg-muted/50 p-2 text-[11px] whitespace-pre-wrap break-words">
        {JSON.stringify(Object.fromEntries(entries), null, 2)}
      </pre>
    </details>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

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

        // Normalise sentinel message — keep it so DemoMessage can skip the bubble
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "assistant",
            content: data.message,
            intent: data.intent,
            trace: data.trace,
            data: data.data ?? null,
          },
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
    [loading, messages, sessionId],
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">

        {/* ── Header ── */}
        <header className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Bot className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-semibold">Multi-Agent Workflow Demo</h1>
            <span className="ml-1 rounded-full border border-green-500/40 bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-400">
              Public · No login required
            </span>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Live view of the orchestrator classifying intent and routing to a specialist agent.
            Restaurant cards are clickable. Reservation and payment actions show the real
            <span className="inline-flex items-center gap-0.5 mx-1 text-muted-foreground">
              <Lock className="h-3 w-3" />sign-in required
            </span>
            branch without mutating any data.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 items-start">

          {/* ── Chat panel ── */}
          <Card className="p-0 overflow-hidden flex flex-col" style={{ height: 580 }}>
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
                <DemoMessage key={m.id} m={m} onSend={send} />
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
              <Button
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => send(input)}
                disabled={!input.trim() || loading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </Card>

          {/* ── Pipeline visualization ── */}
          <div className="space-y-4">

            {/* Orchestrator → agents flow */}
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
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 w-full">
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
                        <span className={`text-[10px] font-medium leading-tight ${active ? "text-primary" : "text-foreground"}`}>
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>

            {/* Execution trace */}
            <Card className="p-5">
              <h2 className="text-sm font-semibold mb-3">
                Execution Trace
                {lastAssistant?.trace && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {lastAssistant.trace.length} steps · last message
                  </span>
                )}
              </h2>

              {!lastAssistant?.trace || lastAssistant.trace.length === 0 ? (
                <p className="text-sm text-muted-foreground">Send a message to see the pipeline trace.</p>
              ) : (
                <ol className="space-y-2 max-h-80 overflow-y-auto pr-1">
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
