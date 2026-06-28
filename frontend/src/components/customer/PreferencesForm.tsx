"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

const CUISINE_OPTIONS = [
  "Sri Lankan","Japanese","Italian","Indian","Chinese","Thai","Seafood","BBQ",
  "Burger","Pizza","Sushi","Vegetarian","Mediterranean","French","Mexican",
];
const DIETARY_OPTIONS = ["Vegetarian","Vegan","Halal","Gluten-Free","Dairy-Free","Nut-Free","Kosher"];
const SEATING_OPTIONS = ["Indoor","Outdoor","Bar","Booth","High-Top","Private Room"];

interface Prefs {
  preferredCuisines?: string[];
  dietaryRestrictions?: string[];
  budgetPreference?: string;
  seatingPreferences?: string[];
}

export function PreferencesForm({ initial }: { initial: Record<string, unknown> | null }) {
  const pref = (initial ?? {}) as Prefs;
  const [cuisines, setCuisines] = useState<string[]>(pref.preferredCuisines ?? []);
  const [dietary, setDietary] = useState<string[]>(pref.dietaryRestrictions ?? []);
  const [budget, setBudget] = useState<string>(pref.budgetPreference ?? "");
  const [seating, setSeating] = useState<string[]>(pref.seatingPreferences ?? []);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const toggle = (arr: string[], val: string, set: (v: string[]) => void) => {
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  const save = async () => {
    setStatus("saving");
    const res = await fetch("/api/proxy/users/me/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preferredCuisines: cuisines,
        dietaryRestrictions: dietary,
        budgetPreference: budget || undefined,
        seatingPreferences: seating,
      }),
    });
    setStatus(res.ok ? "saved" : "error");
    if (res.ok) setTimeout(() => setStatus("idle"), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Dining Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Preferred Cuisines */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Preferred Cuisines</Label>
          <div className="flex flex-wrap gap-1.5">
            {CUISINE_OPTIONS.map((c) => (
              <button
                key={c}
                onClick={() => toggle(cuisines, c, setCuisines)}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  cuisines.includes(c)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                {c}
                {cuisines.includes(c) && <X className="inline h-2.5 w-2.5 ml-1" />}
              </button>
            ))}
          </div>
        </div>

        {/* Dietary Restrictions */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Dietary Restrictions</Label>
          <div className="flex flex-wrap gap-1.5">
            {DIETARY_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => toggle(dietary, d, setDietary)}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  dietary.includes(d)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                {d}
                {dietary.includes(d) && <X className="inline h-2.5 w-2.5 ml-1" />}
              </button>
            ))}
          </div>
        </div>

        {/* Budget */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Budget Preference</Label>
          <Select value={budget} onValueChange={setBudget}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="No preference" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BUDGET">Budget</SelectItem>
              <SelectItem value="MODERATE">Moderate</SelectItem>
              <SelectItem value="EXPENSIVE">Expensive</SelectItem>
              <SelectItem value="FINE_DINING">Fine Dining</SelectItem>
            </SelectContent>
          </Select>
          {budget && (
            <button onClick={() => setBudget("")} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>

        {/* Seating */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Seating Preferences</Label>
          <div className="flex flex-wrap gap-1.5">
            {SEATING_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => toggle(seating, s, setSeating)}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  seating.includes(s)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                {s}
                {seating.includes(s) && <X className="inline h-2.5 w-2.5 ml-1" />}
              </button>
            ))}
          </div>
        </div>

        {/* Summary badges */}
        {(cuisines.length > 0 || dietary.length > 0 || budget || seating.length > 0) && (
          <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Your preferences:</p>
            <div className="flex flex-wrap gap-1">
              {cuisines.map((c) => <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>)}
              {dietary.map((d) => <Badge key={d} variant="outline" className="text-[10px]">{d}</Badge>)}
              {budget && <Badge className="text-[10px]">{budget}</Badge>}
              {seating.map((s) => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>)}
            </div>
          </div>
        )}

        {status === "error" && <p className="text-sm text-destructive">Failed to save. Please try again.</p>}

        <Button onClick={save} disabled={status === "saving"}>
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved!" : "Save Preferences"}
        </Button>
      </CardContent>
    </Card>
  );
}
