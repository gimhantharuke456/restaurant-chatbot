"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";

interface Props {
  restaurantId: string;
}

export function FavoriteButton({ restaurantId }: Props) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/proxy/users/me/favorites/${restaurantId}/check`)
      .then((r) => r.ok ? r.json() : { isFavorited: false })
      .then((d: { isFavorited: boolean }) => { setIsFavorited(d.isFavorited); setLoading(false); })
      .catch(() => setLoading(false));
  }, [restaurantId]);

  const toggle = async () => {
    const next = !isFavorited;
    setIsFavorited(next);
    if (next) {
      await fetch("/api/proxy/users/me/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, collection: "Saved" }),
      });
    } else {
      await fetch(`/api/proxy/users/me/favorites/${restaurantId}`, { method: "DELETE" });
    }
  };

  if (loading) return null;

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggle}
      title={isFavorited ? "Remove from favorites" : "Save to favorites"}
      className={isFavorited ? "border-red-500/50 text-red-500 hover:text-red-600" : ""}
    >
      <Heart className={`h-4 w-4 ${isFavorited ? "fill-red-500 text-red-500" : ""}`} />
    </Button>
  );
}
