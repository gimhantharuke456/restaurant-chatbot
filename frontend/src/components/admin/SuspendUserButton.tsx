"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserX, UserCheck } from "lucide-react";

interface SuspendUserButtonProps {
  userId: string;
  isActive: boolean;
  size?: "sm" | "default";
}

export function SuspendUserButton({
  userId,
  isActive,
  size = "sm",
}: SuspendUserButtonProps) {
  const [active, setActive] = useState(isActive);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    try {
      const action = active ? "suspend" : "activate";
      const res = await fetch(`/api/proxy/admin/users/${userId}/${action}`, {
        method: "PATCH",
      });
      if (res.ok) setActive(!active);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size={size}
      disabled={loading}
      onClick={toggle}
      className={
        active
          ? "text-amber-500 hover:text-amber-600"
          : "text-green-500 hover:text-green-600"
      }
    >
      {active ? (
        <>
          <UserX className="h-4 w-4" />
          {size !== "sm" && <span className="ml-2">Suspend</span>}
        </>
      ) : (
        <>
          <UserCheck className="h-4 w-4" />
          {size !== "sm" && <span className="ml-2">Activate</span>}
        </>
      )}
    </Button>
  );
}
