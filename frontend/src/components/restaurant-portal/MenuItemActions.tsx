"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function ToggleAvailabilityButton({
  itemId,
  isAvailable,
}: {
  itemId: string;
  isAvailable: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleToggle = async () => {
    setLoading(true);
    await fetch(`/api/proxy/restaurant-portal/menu/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: !isAvailable }),
    });
    setLoading(false);
    router.refresh();
  };

  return (
    <Button variant="outline" size="sm" onClick={handleToggle} disabled={loading}>
      {isAvailable ? "Mark Unavailable" : "Mark Available"}
    </Button>
  );
}

export function DeleteMenuItemButton({ itemId }: { itemId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm("Delete this menu item?")) return;
    setLoading(true);
    await fetch(`/api/proxy/restaurant-portal/menu/${itemId}`, { method: "DELETE" });
    setLoading(false);
    router.refresh();
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleDelete} disabled={loading}>
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
}
