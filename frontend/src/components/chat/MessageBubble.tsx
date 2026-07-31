import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Message, RestaurantResult, MenuItemResult } from "@/hooks/useChat";
import { Star, MapPin, Utensils, CreditCard, ExternalLink, ArrowRight, UtensilsCrossed } from "lucide-react";
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
    <Link href={`/restaurants/${r.id}`} className="block group">
      <div className="rounded-xl border border-border bg-card/80 p-3 flex flex-col gap-1.5 hover:border-primary/40 hover:bg-card transition-colors">
        <div className="flex items-start justify-between gap-2">
          <span className="font-semibold text-sm text-foreground leading-tight group-hover:text-primary transition-colors">{r.name}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            {r.avgRating != null && (
              <span className="flex items-center gap-0.5 text-xs text-primary">
                <Star className="h-3 w-3 fill-primary" />
                {r.avgRating.toFixed(1)}
              </span>
            )}
            <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
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
    </Link>
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

// ── Menu item cards ───────────────────────────────────────────────────────────

function MenuItemCard({ item, onOrder }: { item: MenuItemResult; onOrder: (item: MenuItemResult) => void }) {
  return (
    <button
      onClick={() => onOrder(item)}
      className="flex gap-3 items-center rounded-xl border border-border bg-card/80 p-2.5 w-full text-left hover:border-primary/40 hover:bg-card transition-colors group"
    >
      {item.imageUrl ? (
        <div className="relative h-14 w-14 shrink-0 rounded-lg overflow-hidden bg-muted">
          <Image src={item.imageUrl} alt={item.name} fill className="object-cover" unoptimized />
        </div>
      ) : (
        <div className="h-14 w-14 shrink-0 rounded-lg bg-muted flex items-center justify-center">
          <UtensilsCrossed className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-tight group-hover:text-primary transition-colors">
          {item.name}
        </p>
        {item.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>
        )}
        <p className="text-sm font-semibold text-primary mt-1">LKR {item.price.toLocaleString()}</p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
    </button>
  );
}

function MenuItemList({ items, onOrder }: { items: MenuItemResult[]; onOrder: (item: MenuItemResult) => void }) {
  return (
    <div className="flex flex-col gap-2 w-full max-w-sm">
      <p className="text-xs text-muted-foreground mb-1">
        {items[0]?.restaurantName}&apos;s menu · tap a dish to start ordering
      </p>
      {items.map(item => <MenuItemCard key={item.id} item={item} onOrder={onOrder} />)}
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

function isRestaurantData(data: RestaurantResult[] | MenuItemResult[]): data is RestaurantResult[] {
  return data.length > 0 && "cuisineTypes" in data[0];
}

function isMenuData(data: RestaurantResult[] | MenuItemResult[]): data is MenuItemResult[] {
  return data.length > 0 && "restaurantId" in data[0];
}

export function MessageBubble({ message, onSend }: { message: Message; onSend: (content: string) => void }) {
  const isUser = message.role === "user";
  const isSentinelRestaurantList = message.content === "__RESTAURANT_LIST__" && message.data && message.data.length > 0;
  const isSentinelMenuList = message.content === "__MENU_LIST__" && message.data && message.data.length > 0;
  const hasInlineRestaurantData = !isSentinelRestaurantList && message.data && message.data.length > 0 && isRestaurantData(message.data);
  const hasInlineMenuData = !isSentinelMenuList && message.data && message.data.length > 0 && isMenuData(message.data);

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

      {isSentinelRestaurantList ? (
        <RestaurantList items={message.data as RestaurantResult[]} />
      ) : isSentinelMenuList ? (
        <MenuItemList
          items={message.data as MenuItemResult[]}
          onOrder={(item) => onSend(`I'd like to order ${item.name}`)}
        />
      ) : (
        <div className="flex flex-col gap-3 max-w-[75%]">
          <div
            className={cn(
              "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
              isUser
                ? "bg-primary text-primary-foreground rounded-br-sm whitespace-pre-wrap break-words"
                : "bg-muted text-foreground rounded-bl-sm"
            )}
          >
            {isUser ? message.content : <MessageText content={message.content} />}
          </div>
          {hasInlineRestaurantData && (
            <RestaurantList items={message.data as RestaurantResult[]} />
          )}
          {hasInlineMenuData && (
            <MenuItemList
              items={message.data as MenuItemResult[]}
              onOrder={(item) => onSend(`I'd like to order ${item.name}`)}
            />
          )}
        </div>
      )}
    </div>
  );
}
