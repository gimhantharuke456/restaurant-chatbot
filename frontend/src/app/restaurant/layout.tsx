import { requireRestaurantAdmin } from "@/lib/server/auth";
import { PortalShell } from "@/components/restaurant-portal/PortalShell";

export default async function RestaurantPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRestaurantAdmin();

  return (
    <PortalShell email={user.email} name={user.name}>
      {children}
    </PortalShell>
  );
}
