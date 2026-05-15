"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface VerifyRestaurantButtonProps {
  id: string;
  isVerified: boolean;
}

export function VerifyRestaurantButton({
  id,
  isVerified: initialVerified,
}: VerifyRestaurantButtonProps) {
  const [verified, setVerified] = useState(initialVerified);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (verified) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <CheckCircle2 className="h-4 w-4" />
        Verified
      </div>
    );
  }

  const handleVerify = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/proxy/admin/restaurants/${id}/verify`, {
        method: "POST",
      });
      if (res.ok) {
        setVerified(true);
        router.refresh(); // re-run SSR to reflect change
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleVerify} disabled={loading} variant="outline">
      <CheckCircle2 className="mr-2 h-4 w-4" />
      {loading ? "Verifying…" : "Verify Restaurant"}
    </Button>
  );
}
