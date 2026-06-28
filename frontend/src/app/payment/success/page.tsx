"use client";

import { useSearchParams } from "next/navigation";
import { CheckCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Suspense } from "react";

function SuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
        <CheckCircle className="h-10 w-10 text-green-500" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Payment Successful!</h1>
        <p className="text-muted-foreground">
          Your order has been confirmed and a receipt has been sent to your email.
        </p>
        {sessionId && (
          <p className="text-xs text-muted-foreground/60 font-mono">{sessionId}</p>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href="/reservations">View My Reservations</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/chat">Back to Chat</Link>
        </Button>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
