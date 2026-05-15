import { cookies } from "next/headers";
import { AUTH_COOKIE } from "@/lib/cookie";

const BACKEND = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:3000";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export async function serverFetch<T>(
  path: string,
  options: { method?: Method; body?: unknown } = {}
): Promise<T> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;

  const res = await fetch(`${BACKEND}/api/${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Backend error ${res.status}: ${path}`);
  }

  return res.json() as Promise<T>;
}
