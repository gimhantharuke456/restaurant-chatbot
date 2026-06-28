"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock } from "lucide-react";

interface Props {
  restaurantId: string;
  restaurantName: string;
}

export function WaitlistJoinForm({ restaurantId, restaurantName }: Props) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("19:00");
  const [partySize, setPartySize] = useState(2);
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState<{ position: number } | null>(null);
  const [error, setError] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/proxy/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId, date, time, partySize }),
    });
    if (res.ok) {
      const data = await res.json() as { position: number };
      setJoined({ position: data.position });
    } else {
      const err = await res.json().catch(() => ({})) as { error?: string };
      setError(err.error ?? "Failed to join waitlist.");
    }
    setLoading(false);
  };

  if (joined) {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-1">
        <p className="text-sm font-semibold text-foreground">You&apos;re on the waitlist!</p>
        <p className="text-xs text-muted-foreground">
          Position #{joined.position} at {restaurantName} · You&apos;ll be notified when a slot opens.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {!open ? (
        <Button variant="outline" className="w-full gap-2" onClick={() => setOpen(true)}>
          <Clock className="h-4 w-4" />
          Join Waitlist
        </Button>
      ) : (
        <form onSubmit={submit} className="rounded-xl border bg-card p-4 space-y-3">
          <p className="text-sm font-semibold">Join the Waitlist</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1 space-y-1">
              <Label className="text-xs">Party Size</Label>
              <Input type="number" min={1} max={20} value={partySize} onChange={(e) => setPartySize(Number(e.target.value))} className="h-8 text-sm" />
            </div>
            <div className="col-span-1 space-y-1">
              <Label className="text-xs">Date</Label>
              <Input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className="h-8 text-sm" required />
            </div>
            <div className="col-span-1 space-y-1">
              <Label className="text-xs">Time</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-8 text-sm" required />
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={loading}>{loading ? "Joining…" : "Join Waitlist"}</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      )}
    </div>
  );
}
