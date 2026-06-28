import { cookies } from "next/headers";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { AUTH_COOKIE } from "@/lib/cookie";

const f = createUploadthing();

const BACKEND = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:3000";

async function requireRestaurantAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) throw new UploadThingError("Unauthorized");

  const res = await fetch(`${BACKEND}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new UploadThingError("Unauthorized");

  const user = await res.json() as { role: string };
  if (user.role !== "RESTAURANT_ADMIN" && user.role !== "SYSTEM_ADMIN") {
    throw new UploadThingError("Forbidden");
  }
  return {};
}

async function requireAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) throw new UploadThingError("Unauthorized");

  const res = await fetch(`${BACKEND}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new UploadThingError("Unauthorized");
  return {};
}

export const ourFileRouter = {
  restaurantImage: f({ image: { maxFileSize: "4MB", maxFileCount: 5 } })
    .middleware(() => requireRestaurantAdmin())
    .onUploadComplete(({ file }) => ({ url: file.url })),

  menuItemImage: f({ image: { maxFileSize: "2MB", maxFileCount: 1 } })
    .middleware(() => requireRestaurantAdmin())
    .onUploadComplete(({ file }) => ({ url: file.url })),

  reviewImage: f({ image: { maxFileSize: "4MB", maxFileCount: 3 } })
    .middleware(() => requireAuthenticated())
    .onUploadComplete(({ file }) => ({ url: file.url })),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
