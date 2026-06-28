"use client";

import { XCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PaymentCancelPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10">
        <XCircle className="h-10 w-10 text-red-500" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Payment Cancelled</h1>
        <p className="text-muted-foreground">
          Your payment was cancelled. Your reservation is still confirmed — you can pay later via the chat.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href="/chat">Return to Chat</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/reservations">My Reservations</Link>
        </Button>
      </div>
    </div>
  );
}
