import { redirect } from "next/navigation";
import { serverFetch } from "./api";

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: "SYSTEM_ADMIN" | "RESTAURANT_ADMIN" | "CUSTOMER";
}

export async function requireRestaurantAdmin(): Promise<AdminUser> {
  try {
    const user = await serverFetch<AdminUser>("auth/me");
    if (user.role !== "RESTAURANT_ADMIN") {
      redirect("/login");
    }
    return user;
  } catch {
    redirect("/login");
  }
}

export async function requireAdmin(): Promise<AdminUser> {
  try {
    const user = await serverFetch<AdminUser>("auth/me");
    if (user.role !== "SYSTEM_ADMIN") {
      redirect("/login");
    }
    return user;
  } catch {
    redirect("/login");
  }
}

export async function requireCustomer(): Promise<AdminUser> {
  try {
    const user = await serverFetch<AdminUser>("auth/me");
    if (user.role !== "CUSTOMER") {
      redirect("/login");
    }
    return user;
  } catch {
    redirect("/login");
  }
}

export async function getAuthenticatedUser(): Promise<AdminUser | null> {
  try {
    return await serverFetch<AdminUser>("auth/me");
  } catch {
    return null;
  }
}
