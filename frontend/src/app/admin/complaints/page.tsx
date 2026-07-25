"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, MessageSquareWarning } from "lucide-react";

interface Complaint {
  id: string;
  subject: string;
  description: string;
  status: "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "CLOSED";
  adminNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
  user: { id: string; name: string | null; email: string };
  restaurant: { id: string; name: string } | null;
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

function ComplaintRow({ complaint, onUpdate }: { complaint: Complaint; onUpdate: (updated: Complaint) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState(complaint.status);
  const [note, setNote] = useState(complaint.adminNote ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const res = await fetch(`/api/proxy/admin/complaints/${complaint.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, adminNote: note || undefined }),
    });
    if (res.ok) {
      const updated = await res.json() as Complaint;
      onUpdate(updated);
    }
    setSaving(false);
  };

  return (
    <div className="border-b last:border-b-0">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{complaint.subject}</p>
          <p className="text-xs text-muted-foreground truncate">
            {complaint.user.name ?? complaint.user.email}
            {complaint.restaurant && <> · {complaint.restaurant.name}</>}
            {" · "}{new Date(complaint.createdAt).toLocaleDateString("en-GB")}
          </p>
        </div>
        <Badge variant={STATUS_VARIANT[complaint.status]} className="text-xs shrink-0">
          {STATUS_LABEL[complaint.status]}
        </Badge>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 bg-muted/20">
          <p className="text-sm text-muted-foreground leading-relaxed pt-2">{complaint.description}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Admin Note</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note for the user…"
              rows={2}
              className="text-xs resize-none"
            />
          </div>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function AdminComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (statusFilter !== "all") params.set("status", statusFilter);
    const res = await fetch(`/api/proxy/admin/complaints?${params}`);
    if (res.ok) {
      const result = await res.json() as { data: Complaint[]; total: number };
      setComplaints(result.data);
      setTotal(result.total);
    }
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleUpdate = (updated: Complaint) => {
    setComplaints((p) => p.map((c) => c.id === updated.id ? updated : c));
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Complaints</h1>
        <p className="text-sm text-muted-foreground mt-1">Review and respond to user complaints.</p>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{total} total</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : complaints.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-card/50 py-16 text-center">
          <MessageSquareWarning className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No complaints found.</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          {complaints.map((c) => (
            <ComplaintRow key={c.id} complaint={c} onUpdate={handleUpdate} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-3 justify-center">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
