"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUploader, MultiImageUploader } from "./ImageUploader";
import { Button } from "@/components/ui/button";

interface Props {
  initialImages: string[];
  initialProfileImageUrl: string | null;
  initialCoverImageUrl: string | null;
}

export function RestaurantImageManager({
  initialImages,
  initialProfileImageUrl,
  initialCoverImageUrl,
}: Props) {
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(initialProfileImageUrl);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(initialCoverImageUrl);
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
      body: JSON.stringify({ imageUrls: images, profileImageUrl, coverImageUrl }),
    });
    setSaving(false);
    if (!res.ok) { setError("Failed to save"); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  };

  return (
    <div className="space-y-6">

      {/* Profile Image */}
      <div className="space-y-2">
        <div>
          <p className="text-sm font-medium text-foreground">Profile Image</p>
          <p className="text-xs text-muted-foreground">Shown as the restaurant logo / avatar on cards and the detail page.</p>
        </div>
        <div className="max-w-[200px]">
          <ImageUploader
            endpoint="restaurantImage"
            value={profileImageUrl}
            onChange={setProfileImageUrl}
            label="Upload Logo"
            aspectRatio="1/1"
          />
        </div>
      </div>

      {/* Cover Image */}
      <div className="space-y-2">
        <div>
          <p className="text-sm font-medium text-foreground">Cover Image</p>
          <p className="text-xs text-muted-foreground">Full-width hero banner shown at the top of your restaurant page.</p>
        </div>
        <ImageUploader
          endpoint="restaurantImage"
          value={coverImageUrl}
          onChange={setCoverImageUrl}
          label="Upload Cover Photo"
          aspectRatio="16/5"
        />
      </div>

      {/* Gallery */}
      <div className="space-y-2">
        <div>
          <p className="text-sm font-medium text-foreground">Photo Gallery</p>
          <p className="text-xs text-muted-foreground">Additional photos displayed in the gallery grid on your restaurant page.</p>
        </div>
        <MultiImageUploader value={images} onChange={setImages} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button size="sm" onClick={handleSave} disabled={saving}>
        {saving ? "Saving…" : saved ? "Saved!" : "Save All Photos"}
      </Button>
    </div>
  );
}
