"use client";

import { useRef, useState } from "react";
import { useUploadThing } from "@/lib/uploadthing";
import { Button } from "@/components/ui/button";
import { ImagePlus, Loader2, X } from "lucide-react";
import Image from "next/image";

interface Props {
  endpoint: "restaurantImage" | "menuItemImage";
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  aspectRatio?: string;
}

export function ImageUploader({ endpoint, value, onChange, label = "Upload Image", aspectRatio = "16/9" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const { startUpload, isUploading } = useUploadThing(endpoint, {
    onClientUploadComplete: (res) => {
      if (res?.[0]?.url) onChange(res[0].url);
    },
    onUploadError: () => setError("Upload failed — please try again"),
  });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    await startUpload([file]);
    e.target.value = "";
  };

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative w-full rounded-lg overflow-hidden border border-border bg-muted/30" style={{ aspectRatio }}>
          <Image src={value} alt="Uploaded" fill className="object-cover" unoptimized />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-2 right-2 rounded-full bg-black/60 p-1 hover:bg-black/80 transition-colors"
          >
            <X className="h-3.5 w-3.5 text-white" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/20 py-8 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/40 disabled:opacity-60"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-xs">Uploading…</span>
            </>
          ) : (
            <>
              <ImagePlus className="h-6 w-6" />
              <span className="text-xs font-medium">{label}</span>
              <span className="text-[10px]">PNG, JPG up to {endpoint === "restaurantImage" ? "4" : "2"}MB</span>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ── Multi-image variant for restaurant gallery ────────────────────────────────

interface MultiProps {
  value: string[];
  onChange: (urls: string[]) => void;
}

export function MultiImageUploader({ value, onChange }: MultiProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const { startUpload, isUploading } = useUploadThing("restaurantImage", {
    onClientUploadComplete: (res) => {
      if (res?.length) onChange([...value, ...res.map((f) => f.url)]);
    },
    onUploadError: () => setError("Upload failed — please try again"),
  });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    await startUpload(files);
    e.target.value = "";
  };

  const remove = (url: string) => onChange(value.filter((u) => u !== url));

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {value.map((url) => (
            <div key={url} className="relative rounded-lg overflow-hidden border border-border bg-muted/30" style={{ aspectRatio: "4/3" }}>
              <Image src={url} alt="" fill className="object-cover" unoptimized />
              <button
                type="button"
                onClick={() => remove(url)}
                className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 hover:bg-black/80 transition-colors"
              >
                <X className="h-3 w-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        className="gap-2"
      >
        {isUploading ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
        ) : (
          <><ImagePlus className="h-4 w-4" /> Add Photo</>
        )}
      </Button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFile}
      />

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
