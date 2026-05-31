import { cn } from "@/lib/utils";
import type { Message, RestaurantResult } from "@/hooks/useChat";
import { Star, MapPin, Utensils } from "lucide-react";

const PRICE_LABEL: Record<string, string> = {
  BUDGET: "Budget",
  MODERATE: "Moderate",
  EXPENSIVE: "Expensive",
  FINE_DINING: "Fine Dining",
};

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
            "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words",
            isUser
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-muted text-foreground rounded-bl-sm"
          )}
        >
          {message.content}
        </div>
      )}
    </div>
  );
}
