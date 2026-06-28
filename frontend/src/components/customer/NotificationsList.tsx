"use client";

import { useState } from "react";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  data: Record<string, unknown> | null;
  createdAt: string;
}

export function NotificationsList({
  initial,
  unreadCount: initialUnread,
}: {
  initial: Notification[];
  unreadCount: number;
}) {
  const [items, setItems] = useState(initial);
  const [unread, setUnread] = useState(initialUnread);

  const markRead = async (id: string) => {
    await fetch(`/api/proxy/users/me/notifications/${id}/read`, { method: "PATCH" });
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnread((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await fetch("/api/proxy/users/me/notifications/read-all", { method: "PATCH" });
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
        <Bell className="h-10 w-10" />
        <p className="font-medium">No notifications yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {unread > 0 && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={markAllRead}>
            <Check className="h-4 w-4 mr-1" />
            Mark all as read
          </Button>
        </div>
      )}
      <div className="space-y-2">
        {items.map((n) => (
          <div
            key={n.id}
            onClick={() => !n.isRead && markRead(n.id)}
            className={`rounded-xl border p-4 cursor-pointer transition-colors ${
              n.isRead
                ? "bg-card border-border"
                : "bg-primary/5 border-primary/20 hover:bg-primary/10"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {n.title}
                  </p>
                  {!n.isRead && (
                    <Badge className="h-1.5 w-1.5 rounded-full p-0 bg-primary shrink-0" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{n.message}</p>
              </div>
              <p className="text-xs text-muted-foreground shrink-0">
                {new Date(n.createdAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
