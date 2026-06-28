import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/server/auth";

export default async function RootPage() {
  const user = await getAuthenticatedUser();

  if (!user) redirect("/login");

  if (user.role === "SYSTEM_ADMIN") redirect("/admin");
  if (user.role === "RESTAURANT_ADMIN") redirect("/restaurant");
  redirect("/home");
}
