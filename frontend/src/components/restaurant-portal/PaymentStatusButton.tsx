"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2 } from "lucide-react";

interface PaymentStatusButtonProps {
  paymentId: string;
  currentStatus: string;
}

export function PaymentStatusButton({ paymentId, currentStatus }: PaymentStatusButtonProps) {
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canMarkPaid = status === "PENDING";

  async function handleMarkPaid() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/proxy/restaurant-portal/payments/${paymentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SUCCEEDED" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? "Failed to update status");
      }
      setStatus("SUCCEEDED");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  if (!canMarkPaid) {
    return null;
  }

  return (
    <div className="space-y-1">
      <Button
        size="sm"
        variant="outline"
        className="text-green-600 border-green-600/40 hover:bg-green-600/10 hover:text-green-700 text-xs h-7 px-2"
        onClick={handleMarkPaid}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
        )}
        Mark as Paid
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
