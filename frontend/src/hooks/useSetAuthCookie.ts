"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AUTH_COOKIE, COOKIE_MAX_AGE } from "@/lib/cookie";

export function useSetAuthCookie() {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdToken();
        document.cookie = `${AUTH_COOKIE}=${token}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
      } else {
        document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`;
      }
    });
    return () => unsubscribe();
  }, []);
}
