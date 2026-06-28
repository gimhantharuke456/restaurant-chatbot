import { serverFetch } from "@/lib/server/api";
import { NotificationsList } from "@/components/customer/NotificationsList";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  data: Record<string, unknown> | null;
  createdAt: string;
}

interface NotificationsResponse {
  data: Notification[];
  total: number;
  unreadCount: number;
}

export default async function NotificationsPage() {
  const result = await serverFetch<NotificationsResponse>(
    "users/me/notifications?limit=50"
  ).catch(() => ({ data: [], total: 0, unreadCount: 0 }));

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold">Notifications</h1>
          {result.unreadCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {result.unreadCount} unread
            </span>
          )}
        </div>
        <NotificationsList
          initial={result.data}
          unreadCount={result.unreadCount}
        />
      </div>
    </div>
  );
}
