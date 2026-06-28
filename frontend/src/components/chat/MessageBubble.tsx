import { cn } from "@/lib/utils";
import type { Message, RestaurantResult } from "@/hooks/useChat";
import { Star, MapPin, Utensils, CreditCard, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";

const PRICE_LABEL: Record<string, string> = {
  BUDGET: "Budget",
  MODERATE: "Moderate",
  EXPENSIVE: "Expensive",
  FINE_DINING: "Fine Dining",
};

// ── Restaurant cards ──────────────────────────────────────────────────────────

function RestaurantCard({ r }: { r: RestaurantResult }) {
  let cuisines: string[] = [];
  try { cuisines = JSON.parse(r.cuisineTypes); } catch { cuisines = [r.cuisineTypes]; }

  return (
    <div className="rounded-xl border border-border bg-card/80 p-3 flex flex-col gap-1.5">
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-sm text-foreground leading-tight">{r.name}</span>
        {r.avgRating != null && (
          <span className="flex items-center gap-0.5 text-xs text-primary shrink-0">
            <Star className="h-3 w-3 fill-primary" />
            {r.avgRating.toFixed(1)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <MapPin className="h-3 w-3 shrink-0" />
        <span>{r.area}</span>
        <span className="mx-1">·</span>
        <span>{PRICE_LABEL[r.priceRange] ?? r.priceRange}</span>
      </div>

      {cuisines.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          <Utensils className="h-3 w-3 text-muted-foreground shrink-0" />
          {cuisines.map(c => (
            <span key={c} className="rounded-full bg-primary/10 text-primary text-[10px] px-2 py-0.5">
              {c}
            </span>
          ))}
        </div>
      )}

      {r.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{r.description}</p>
      )}
    </div>
  );
}

function RestaurantList({ items }: { items: RestaurantResult[] }) {
  return (
    <div className="flex flex-col gap-2 w-full max-w-sm">
      <p className="text-xs text-muted-foreground mb-1">Found {items.length} restaurant{items.length !== 1 ? "s" : ""}</p>
      {items.map(r => <RestaurantCard key={r.id} r={r} />)}
    </div>
  );
}

// ── Markdown components ───────────────────────────────────────────────────────

const markdownComponents = {
  p: ({ children }: React.ComponentProps<"p">) => <p className="mb-1 last:mb-0">{children}</p>,
  strong: ({ children }: React.ComponentProps<"strong">) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }: React.ComponentProps<"em">) => <em className="italic">{children}</em>,
  ul: ({ children }: React.ComponentProps<"ul">) => <ul className="my-1 ml-4 list-disc space-y-0.5">{children}</ul>,
  ol: ({ children }: React.ComponentProps<"ol">) => <ol className="my-1 ml-4 list-decimal space-y-0.5">{children}</ol>,
  li: ({ children }: React.ComponentProps<"li">) => <li>{children}</li>,
  h1: ({ children }: React.ComponentProps<"h1">) => <p className="font-bold text-base mt-2 mb-1">{children}</p>,
  h2: ({ children }: React.ComponentProps<"h2">) => <p className="font-bold mt-2 mb-1">{children}</p>,
  h3: ({ children }: React.ComponentProps<"h3">) => <p className="font-semibold mt-1.5 mb-0.5">{children}</p>,
  hr: () => <hr className="my-2 border-border/50" />,
  a: ({ href, children }: React.ComponentProps<"a">) => (
    <a href={href} target="_blank" rel="noopener noreferrer"
       className="text-primary underline underline-offset-2 break-all hover:text-primary/80">
      {children}
    </a>
  ),
  code: ({ children }: React.ComponentProps<"code">) => (
    <code className="rounded bg-background/50 px-1 py-0.5 font-mono text-xs">{children}</code>
  ),
};

// ── Payment link extraction ───────────────────────────────────────────────────

const PAYMENT_LINK_MARKER = "Payment link:";
const STRIPE_URL_RE = /https:\/\/checkout\.stripe\.com\/[^\s<>"]+/;

function extractPaymentUrl(content: string): string | null {
  // Look for explicit marker first
  if (content.includes(PAYMENT_LINK_MARKER)) {
    const idx = content.indexOf(PAYMENT_LINK_MARKER) + PAYMENT_LINK_MARKER.length;
    const url = content.slice(idx).trim().split(/\s/)[0].replace(/[.,)]$/, "");
    if (url.startsWith("http")) return url;
  }
  // Fall back to any Stripe checkout URL in the message
  const match = content.match(STRIPE_URL_RE);
  return match ? match[0] : null;
}

function PaymentButton({ url }: { url: string }) {
  return (
    <div className="mt-3 rounded-xl border border-green-500/30 bg-green-500/5 p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <CreditCard className="h-4 w-4 text-green-500 shrink-0" />
        Secure Payment Ready
      </div>
      <p className="text-xs text-muted-foreground">
        Click below to complete your payment securely via Stripe. Link is valid for 24 hours.
      </p>
      <Button asChild className="w-full bg-green-600 hover:bg-green-700 text-white gap-2">
        <a href={url} target="_blank" rel="noopener noreferrer">
          <CreditCard className="h-4 w-4" />
          Pay Now
          <ExternalLink className="h-3 w-3 opacity-70" />
        </a>
      </Button>
    </div>
  );
}

// ── Message text with payment button ─────────────────────────────────────────

function MessageText({ content }: { content: string }) {
  const paymentUrl = extractPaymentUrl(content);

  // Strip the "Payment link: <url>" line — we show a button instead
  let displayText = content;
  if (paymentUrl && content.includes(PAYMENT_LINK_MARKER)) {
    const markerIdx = content.indexOf(PAYMENT_LINK_MARKER);
    const before = content.slice(0, markerIdx).trimEnd();
    const after = content.slice(markerIdx + PAYMENT_LINK_MARKER.length + paymentUrl.length).trimStart();
    displayText = [before, after].filter(Boolean).join("\n").trim();
  }

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert break-words
                    prose-p:my-0.5 prose-ul:my-1 prose-li:my-0 prose-headings:my-1">
      <ReactMarkdown components={markdownComponents}>{displayText}</ReactMarkdown>
      {paymentUrl && <PaymentButton url={paymentUrl} />}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const isRestaurantList = message.content === "__RESTAURANT_LIST__" && message.data && message.data.length > 0;

  return (
    <div className={cn("flex gap-3 items-end", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        )}
      >
        {isUser ? "U" : "AI"}
      </div>

      {isRestaurantList ? (
        <RestaurantList items={message.data!} />
      ) : (
        <div
          className={cn(
            "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground rounded-br-sm whitespace-pre-wrap break-words"
              : "bg-muted text-foreground rounded-bl-sm"
          )}
        >
          {isUser ? message.content : <MessageText content={message.content} />}
        </div>
      )}
    </div>
  );
}
