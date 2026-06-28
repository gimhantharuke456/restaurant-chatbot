"use client";

import { useState } from "react";
import { SystemSettings } from "@/types/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface SettingsFormProps {
  settings: SystemSettings;
}

export function SettingsForm({ settings }: SettingsFormProps) {
  const [form, setForm] = useState<SystemSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const updateField = <K extends keyof SystemSettings>(
    key: K,
    value: SystemSettings[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/proxy/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">System Flags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Maintenance Mode</Label>
              <p className="text-xs text-muted-foreground">
                Blocks all non-admin traffic
              </p>
            </div>
            <Switch
              checked={form.maintenanceMode}
              onCheckedChange={(v) => updateField("maintenanceMode", v)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">User Registration</Label>
              <p className="text-xs text-muted-foreground">
                Allow new users to sign up
              </p>
            </div>
            <Switch
              checked={form.registrationEnabled}
              onCheckedChange={(v) => updateField("registrationEnabled", v)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="maxReservations">
              Max Reservations Per Day (system-wide)
            </Label>
            <Input
              id="maxReservations"
              type="number"
              min={1}
              value={form.maxReservationsPerDay}
              onChange={(e) =>
                updateField("maxReservationsPerDay", Number(e.target.value))
              }
              className="w-48"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supportEmail">Support Email</Label>
            <Input
              id="supportEmail"
              type="email"
              value={form.supportEmail}
              onChange={(e) => updateField("supportEmail", e.target.value)}
              className="w-80"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ngrokUrl">ngrok Public URL</Label>
            <Input
              id="ngrokUrl"
              placeholder="https://xxxx.ngrok-free.app"
              value={form.ngrokUrl ?? ""}
              onChange={(e) =>
                updateField("ngrokUrl", e.target.value || null)
              }
              className="w-80"
            />
            <p className="text-xs text-muted-foreground">
              Used as Stripe webhook endpoint. Check ngrok dashboard at
              localhost:4040.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Settings"}
        </Button>
        {saved && (
          <span className="text-sm text-green-600">Settings saved!</span>
        )}
      </div>
    </div>
  );
}
