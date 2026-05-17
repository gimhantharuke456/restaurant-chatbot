import { serverFetch } from "@/lib/server/api";
import { PageHeader } from "@/components/admin/PageHeader";
import { UserProfileCard } from "@/components/admin/UserProfileCard";
import { UserReservationHistory } from "@/components/admin/UserReservationHistory";
import { UserRoleSelect } from "@/components/admin/UserRoleSelect";
import { TabPanel } from "@/components/admin/TabPanel";
import { AdminUserDetail } from "@/types/admin";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await serverFetch<AdminUserDetail>(`admin/users/${id}`);

  return (
    <div>
      <PageHeader
        title={user.name ?? user.email}
        description={user.email}
        actions={
          <div className="flex items-center gap-3">
            <Link href="/admin/users">
              <Button variant="ghost" size="sm">
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
            </Link>
            <UserRoleSelect userId={user.id} currentRole={user.role} />
          </div>
        }
      />

      <div className="p-8">
        <TabPanel
          tabs={[
            {
              value: "profile",
              label: "Profile",
              content: <UserProfileCard user={user} />,
            },
            {
              value: "reservations",
              label: `Reservations (${user.reservations.length})`,
              content: (
                <UserReservationHistory reservations={user.reservations} />
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
