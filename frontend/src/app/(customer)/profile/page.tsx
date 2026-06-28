import { serverFetch } from "@/lib/server/api";
import { ProfileForm } from "@/components/customer/ProfileForm";
import { PreferencesForm } from "@/components/customer/PreferencesForm";
import { InsightsCard } from "@/components/customer/InsightsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  createdAt: string;
  diningPreferences: Record<string, unknown> | null;
  _count?: { reservations: number; reviews: number };
}

interface Insights {
  totalDiningExperiences: number;
  totalSpent: number;
  avgRatingGiven: number | null;
  topCuisines: { cuisine: string; count: number }[];
  topRestaurants: { id: string; name: string; count: number }[];
  monthlyDining: { month: string; count: number }[];
}

export default async function ProfilePage() {
  const user = await serverFetch<UserProfile>("users/me/full").catch(
    () => serverFetch<UserProfile>("users/me")
  );

  const [preferences, insights] = await Promise.all([
    serverFetch<Record<string, unknown>>("users/me/preferences").catch(() => null),
    serverFetch<Insights>("users/me/insights").catch(() => null),
  ]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <h1 className="text-xl font-semibold">My Profile</h1>

        {/* Avatar card */}
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

        <Tabs defaultValue="account">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="space-y-4 mt-4">
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
          </TabsContent>

          <TabsContent value="preferences" className="mt-4">
            <PreferencesForm initial={preferences} />
          </TabsContent>

          <TabsContent value="insights" className="mt-4">
            <InsightsCard insights={insights} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
