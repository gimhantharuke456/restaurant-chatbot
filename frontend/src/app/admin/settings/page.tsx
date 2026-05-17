import { serverFetch } from "@/lib/server/api";
import { PageHeader } from "@/components/admin/PageHeader";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { SystemSettings } from "@/types/admin";

export default async function SettingsPage() {
  const settings = await serverFetch<SystemSettings>("admin/settings");

  return (
    <div>
      <PageHeader title="Settings" description="System-level configuration" />

      <div className="max-w-2xl p-8">
        <SettingsForm settings={settings} />
      </div>
    </div>
  );
}
