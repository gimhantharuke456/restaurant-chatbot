"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ToggleRestaurantButtonProps {
  id: string;
  isActive: boolean;
}

export function ToggleRestaurantButton({
  id,
  isActive: initialActive,
}: ToggleRestaurantButtonProps) {
  const [active, setActive] = useState(initialActive);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/proxy/admin/restaurants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !active }),
      });
      if (res.ok) setActive(!active);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={active ? "outline" : "default"}
      size="sm"
      onClick={toggle}
      disabled={loading}
    >
      {loading ? "…" : active ? "Disable" : "Enable"}
    </Button>
  );
}
