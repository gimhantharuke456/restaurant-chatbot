"use client";

import { useSetAuthCookie } from "@/hooks/useSetAuthCookie";

export function AuthCookieWriter() {
  useSetAuthCookie();
  return null;
}
