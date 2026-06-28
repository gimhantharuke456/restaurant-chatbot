"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, X } from "lucide-react";

interface WaitlistEntry {
  id: string;
  date: string;
  time: string;
  partySize: number;
  position: number;
  status: "WAITING" | "NOTIFIED" | "EXPIRED" | "BOOKED";
  restaurant: { id: string; name: string };
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  WAITING: "secondary",
  NOTIFIED: "default",
  EXPIRED: "outline",
  BOOKED: "default",
};

const STATUS_LABEL: Record<string, string> = {
  WAITING: "Waiting",
  NOTIFIED: "Table Available!",
  EXPIRED: "Expired",
  BOOKED: "Booked",
};

export default function WaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/proxy/waitlist")
      .then((r) => r.ok ? r.json() : [])
      .then((d) => { setEntries(d as WaitlistEntry[]); setLoaded(true); });
  }, []);

  const leave = async (id: string) => {
    await fetch(`/api/proxy/waitlist/${id}`, { method: "DELETE" });
    setEntries((p) => p.filter((e) => e.id !== id));
  };

  if (!loaded) return null;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <h1 className="text-xl font-semibold">My Waitlists</h1>

        {entries.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card/50 p-12 flex flex-col items-center gap-3 text-center">
            <Clock className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium text-foreground">No active waitlists</p>
            <p className="text-sm text-muted-foreground">When a restaurant is fully booked, you can join the waitlist from its page.</p>
            <Button asChild variant="outline" size="sm" className="mt-2">
              <Link href="/home">Browse Restaurants</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div key={entry.id} className="rounded-xl border bg-card p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/restaurants/${entry.restaurant.id}`} className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
                      {entry.restaurant.name}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(entry.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                      {" at "}{entry.time}
                      {" · "}{entry.partySize} {entry.partySize === 1 ? "person" : "people"}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[entry.status]} className="text-xs shrink-0">
                    {STATUS_LABEL[entry.status]}
                  </Badge>
                </div>

                {entry.status === "WAITING" && (
                  <p className="text-xs text-muted-foreground">
                    Queue position: <span className="font-semibold text-foreground">#{entry.position}</span>
                  </p>
                )}

                {entry.status === "NOTIFIED" && (
                  <div className="rounded-lg bg-primary/10 border border-primary/30 px-3 py-2">
                    <p className="text-xs text-primary font-medium">A table is available! Book now before the slot fills up.</p>
                    <Button asChild size="sm" className="mt-2 h-7 text-xs gap-1">
                      <Link href={`/chat?restaurant=${encodeURIComponent(entry.restaurant.name)}`}>
                        Book via AI Chat
                      </Link>
                    </Button>
                  </div>
                )}

                {(entry.status === "WAITING" || entry.status === "NOTIFIED") && (
                  <button
                    onClick={() => leave(entry.id)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <X className="h-3 w-3" />
                    Leave waitlist
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
