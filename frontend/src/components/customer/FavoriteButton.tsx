"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Heart, X } from "lucide-react";

interface Props {
  restaurantId: string;
}

const SUGGESTED_COLLECTIONS = ["Favorites", "Date Night", "Family Dining", "Business"];

export function FavoriteButton({ restaurantId }: Props) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [collections, setCollections] = useState<string[]>([]);
  const [newCollection, setNewCollection] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/proxy/users/me/favorites/${restaurantId}/check`)
      .then((r) => r.ok ? r.json() : { isFavorited: false })
      .then((d: { isFavorited: boolean }) => { setIsFavorited(d.isFavorited); setLoading(false); })
      .catch(() => setLoading(false));
  }, [restaurantId]);

  const openPicker = async () => {
    setShowPicker(true);
    try {
      const res = await fetch("/api/proxy/users/me/favorites");
      if (res.ok) {
        const favs = (await res.json()) as { collection: string }[];
        setCollections(Array.from(new Set(favs.map((f) => f.collection))));
      }
    } catch {
      // fall back to suggested collections only
    }
  };

  const saveToCollection = async (collection: string) => {
    if (!collection.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/proxy/users/me/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, collection: collection.trim() }),
      });
      setIsFavorited(true);
      setShowPicker(false);
      setNewCollection("");
    } finally {
      setSaving(false);
    }
  };

  const removeFavorite = async () => {
    setIsFavorited(false);
    await fetch(`/api/proxy/users/me/favorites/${restaurantId}`, { method: "DELETE" });
  };

  if (loading) return null;

  const options = Array.from(new Set([...SUGGESTED_COLLECTIONS, ...collections]));

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={() => (isFavorited ? removeFavorite() : openPicker())}
        title={isFavorited ? "Remove from favorites" : "Save to favorites"}
        className={isFavorited ? "border-red-500/50 text-red-500 hover:text-red-600" : ""}
      >
        <Heart className={`h-4 w-4 ${isFavorited ? "fill-red-500 text-red-500" : ""}`} />
      </Button>

      {showPicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowPicker(false); }}
        >
          <div className="w-full max-w-xs rounded-xl bg-card border border-border shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="font-semibold text-sm text-foreground">Save to collection</h2>
              <button
                onClick={() => setShowPicker(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                {options.map((c) => (
                  <button
                    key={c}
                    type="button"
                    disabled={saving}
                    onClick={() => saveToCollection(c)}
                    className="rounded-full border border-border px-3 py-1 text-xs hover:border-primary hover:text-primary disabled:opacity-50"
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newCollection}
                  onChange={(e) => setNewCollection(e.target.value)}
                  placeholder="New collection name"
                  maxLength={40}
                  className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <Button
                  size="sm"
                  disabled={!newCollection.trim() || saving}
                  onClick={() => saveToCollection(newCollection)}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
