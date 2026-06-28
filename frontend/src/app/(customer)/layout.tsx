import { requireCustomer } from "@/lib/server/auth";
import { CustomerNav } from "@/components/customer/CustomerNav";
import { ChatWidget } from "@/components/chat/ChatWidget";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireCustomer();

  return (
    <div className="flex h-screen flex-col">
      <CustomerNav email={user.email} name={user.name} />
      <main className="flex-1 overflow-y-auto">{children}</main>
      <ChatWidget />
    </div>
  );
}
