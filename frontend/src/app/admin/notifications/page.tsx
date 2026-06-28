import { requireAdmin } from "@/lib/server/auth";
import { PageHeader } from "@/components/admin/PageHeader";
import { BroadcastForm } from "@/components/admin/BroadcastForm";

export default async function NotificationsPage() {
  await requireAdmin();

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Send system announcements to users"
      />
      <div className="p-8">
        <BroadcastForm />
      </div>
    </div>
  );
}
