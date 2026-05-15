import { requireAdmin } from "@/lib/server/auth";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <AdminShell email={user.email} name={user.name}>
      {children}
    </AdminShell>
  );
}
