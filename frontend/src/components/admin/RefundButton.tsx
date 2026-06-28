"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PaymentStatus } from "@/types/admin";
import { RotateCcw } from "lucide-react";

interface RefundButtonProps {
  paymentId: string;
  amount: number;
  currency: string;
  initialStatus: PaymentStatus;
}

export function RefundButton({
  paymentId,
  amount,
  currency,
  initialStatus,
}: RefundButtonProps) {
  const [status, setStatus] = useState<PaymentStatus>(initialStatus);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (status !== "SUCCEEDED") {
    return (
      <span className="text-xs text-muted-foreground">
        {status === "REFUNDED" ? "Refunded" : "—"}
      </span>
    );
  }

  const handleRefund = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/proxy/admin/payments/${paymentId}/refund`,
        { method: "POST" }
      );
      if (res.ok) setStatus("REFUNDED");
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-red-600 hover:bg-red-50 hover:text-red-700"
        onClick={() => setOpen(true)}
      >
        <RotateCcw className="mr-1 h-3 w-3" />
        Refund
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Issue Refund?</AlertDialogTitle>
            <AlertDialogDescription>
              This will refund{" "}
              <strong>
                {currency} {amount.toLocaleString()}
              </strong>{" "}
              via Stripe. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRefund}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? "Refunding…" : "Issue Refund"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
