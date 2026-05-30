import { requireCustomer } from "@/lib/server/auth";
import { CustomerNav } from "@/components/customer/CustomerNav";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireCustomer();

  return (
    <div className="flex h-screen flex-col">
      <CustomerNav email={user.email} name={user.name} />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
