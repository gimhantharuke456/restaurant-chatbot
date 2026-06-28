"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MultiImageUploader } from "./ImageUploader";
import { Button } from "@/components/ui/button";

interface Props {
  initialImages: string[];
}

export function RestaurantImageManager({ initialImages }: Props) {
  const [images, setImages] = useState<string[]>(initialImages);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/proxy/restaurant-portal/restaurant", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrls: images }),
    });
    setSaving(false);
    if (!res.ok) { setError("Failed to save"); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  };

  return (
    <div className="space-y-3">
      <MultiImageUploader value={images} onChange={setImages} />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button size="sm" onClick={handleSave} disabled={saving}>
        {saving ? "Saving…" : saved ? "Saved!" : "Save Photos"}
      </Button>
    </div>
  );
}
