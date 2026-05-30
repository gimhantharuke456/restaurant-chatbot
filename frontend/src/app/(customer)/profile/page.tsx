import { serverFetch } from "@/lib/server/api";
import { ProfileForm } from "@/components/customer/ProfileForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  createdAt: string;
  _count?: { reservations: number; reviews: number };
}

export default async function ProfilePage() {
  const user = await serverFetch<UserProfile>("users/me/full").catch(
    () => serverFetch<UserProfile>("users/me")
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <h1 className="text-xl font-semibold">My Profile</h1>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-lg">
              {(user.name ?? user.email)[0].toUpperCase()}
            </div>
            <div>
              <p className="font-medium">{user.name ?? "(no name)"}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <Badge variant="secondary" className="mt-1 text-xs">{user.role}</Badge>
            </div>
          </CardContent>
        </Card>

        <ProfileForm user={user} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account info</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>Member since {new Date(user.createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</p>
            {user._count && (
              <p>{user._count.reservations} reservation{user._count.reservations !== 1 ? "s" : ""} made</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
