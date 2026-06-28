"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send } from "lucide-react";

interface BroadcastResult {
  sent: number;
}

export function BroadcastForm() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [role, setRole] = useState<string>("all");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<BroadcastResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setSending(true);
    setResult(null);
    setError(null);

    try {
      const body: Record<string, string> = { title, message };
      if (role !== "all") body.role = role;

      const res = await fetch("/api/proxy/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to send");
      }

      const data = (await res.json()) as BroadcastResult;
      setResult(data);
      setTitle("");
      setMessage("");
      setRole("all");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Broadcast Announcement</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Announcement title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Write your message here…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                required
              />
            </div>

            <div className="space-y-1">
              <Label>Audience</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="CUSTOMER">Customers only</SelectItem>
                  <SelectItem value="RESTAURANT_ADMIN">Restaurant Admins only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={sending || !title.trim() || !message.trim()}>
              <Send className="mr-2 h-4 w-4" />
              {sending ? "Sending…" : "Send Announcement"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card className="border-green-500/30 bg-green-500/10">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-green-400">
              Announcement sent to {result.sent} recipient{result.sent !== 1 ? "s" : ""}.
            </p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-500/30 bg-red-500/10">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
