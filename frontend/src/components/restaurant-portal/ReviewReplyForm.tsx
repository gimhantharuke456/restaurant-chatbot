"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ReviewReplyForm({ reviewId, existingReply }: { reviewId: string; existingReply?: string | null }) {
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState(existingReply ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!existingReply);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/proxy/restaurant-portal/reviews/${reviewId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply }),
    });
    setSaving(false);
    if (res.ok) { setSaved(true); setOpen(false); }
  };

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {saved ? "Edit Reply" : "Reply"}
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2 mt-2">
      <Textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        placeholder="Write your reply to this review…"
        rows={3}
        autoFocus
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={saving || !reply.trim()}>
          {saving ? "Saving…" : "Post Reply"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
