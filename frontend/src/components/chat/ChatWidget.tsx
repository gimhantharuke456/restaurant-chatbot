"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { UtensilsCrossed } from "lucide-react";

/**
 * Floating bottom-right trigger. Per design direction, the chatbot no longer
 * opens as a small side popup — clicking it navigates to the full-page chat
 * at /chat instead.
 */
export function ChatWidget() {
  const router = useRouter();

  // "Book via AI" buttons elsewhere in the app dispatch this event; carry the
  // message along as a query param so /chat can send it on load.
  useEffect(() => {
    const handler = (e: Event) => {
      const msg = (e as CustomEvent<{ message: string }>).detail?.message;
      router.push(msg ? `/chat?prefill=${encodeURIComponent(msg)}` : "/chat");
    };
    window.addEventListener("open-chat-widget", handler);
    return () => window.removeEventListener("open-chat-widget", handler);
  }, [router]);

  return (
    <button
      onClick={() => router.push("/chat")}
      className="fixed bottom-5 right-5 z-50 group flex items-center gap-2.5 rounded-full bg-primary text-primary-foreground px-5 py-3.5 shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105 active:scale-95 transition-all duration-200"
      aria-label="Open chat"
    >
      <UtensilsCrossed className="h-5 w-5" />
      <span className="text-sm font-semibold">Chat</span>
    </button>
  );
}
