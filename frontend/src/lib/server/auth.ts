import { redirect } from "next/navigation";
import { serverFetch } from "./api";

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: "SYSTEM_ADMIN" | "RESTAURANT_ADMIN" | "CUSTOMER";
}

export async function requireAdmin(): Promise<AdminUser> {
  try {
    const user = await serverFetch<AdminUser>("auth/me");
    if (user.role !== "SYSTEM_ADMIN") {
      redirect("/");
    }
    return user;
  } catch {
    redirect("/");
  }
}
