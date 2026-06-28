"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquareWarning, Plus, X } from "lucide-react";

interface Complaint {
  id: string;
  subject: string;
  description: string;
  status: "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "CLOSED";
  adminNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  OPEN: "destructive",
  UNDER_REVIEW: "secondary",
  RESOLVED: "default",
  CLOSED: "outline",
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Open",
  UNDER_REVIEW: "Under Review",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    const res = await fetch("/api/proxy/users/me/complaints");
    if (res.ok) setComplaints(await res.json() as Complaint[]);
    setLoaded(true);
  };

  if (!loaded) {
    load();
    return null;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/proxy/users/me/complaints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, description }),
    });
    if (res.ok) {
      const newOne = await res.json() as Complaint;
      setComplaints((p) => [newOne, ...p]);
      setSubject("");
      setDescription("");
      setShowForm(false);
    } else {
      setError("Failed to submit complaint. Please try again.");
    }
    setSubmitting(false);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">My Complaints</h1>
          <Button size="sm" onClick={() => setShowForm((v) => !v)} variant={showForm ? "outline" : "default"}>
            {showForm ? <><X className="h-4 w-4 mr-1" />Cancel</> : <><Plus className="h-4 w-4 mr-1" />New Complaint</>}
          </Button>
        </div>

        {showForm && (
          <form onSubmit={submit} className="rounded-xl border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold">Submit a Complaint</h2>
            <div className="space-y-1.5">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief summary of the issue" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the issue in detail..." rows={4} required />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Submitting…" : "Submit Complaint"}
            </Button>
          </form>
        )}

        {complaints.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card/50 p-10 text-center space-y-2">
            <MessageSquareWarning className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="font-medium text-foreground">No complaints yet</p>
            <p className="text-sm text-muted-foreground">Use the button above to report an issue.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {complaints.map((c) => (
              <div key={c.id} className="rounded-xl border bg-card p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-foreground leading-tight">{c.subject}</p>
                  <Badge variant={STATUS_VARIANT[c.status]} className="text-xs shrink-0">
                    {STATUS_LABEL[c.status]}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{c.description}</p>
                {c.adminNote && (
                  <div className="rounded-lg bg-muted px-3 py-2">
                    <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Admin note:</span> {c.adminNote}</p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Submitted {new Date(c.createdAt).toLocaleDateString("en-GB")}
                  {c.resolvedAt && ` · Resolved ${new Date(c.resolvedAt).toLocaleDateString("en-GB")}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
