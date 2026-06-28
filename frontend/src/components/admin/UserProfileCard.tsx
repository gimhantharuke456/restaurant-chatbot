import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AdminUserDetail } from "@/types/admin";

interface UserProfileCardProps {
  user: AdminUserDetail;
}

export function UserProfileCard({ user }: UserProfileCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.avatarUrl ?? undefined} />
            <AvatarFallback className="text-xl">
              {(user.name ?? user.email).slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-lg font-semibold">
              {user.name ?? "(no name)"}
            </h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <div className="grid gap-3 text-sm md:grid-cols-2">
          <div>
            <span className="font-medium text-muted-foreground">Role:</span>{" "}
            <Badge variant="secondary">{user.role.replace("_", " ")}</Badge>
          </div>
          {user.phone && (
            <div>
              <span className="font-medium text-muted-foreground">Phone:</span>{" "}
              {user.phone}
            </div>
          )}
          <div>
            <span className="font-medium text-muted-foreground">Joined:</span>{" "}
            {new Date(user.createdAt).toLocaleDateString("en-LK")}
          </div>
          <div>
            <span className="font-medium text-muted-foreground">Reservations:</span>{" "}
            {user._count.reservations}
          </div>
          <div>
            <span className="font-medium text-muted-foreground">Reviews:</span>{" "}
            {user._count.reviews}
          </div>
          {user.role === "RESTAURANT_ADMIN" && (
            <div>
              <span className="font-medium text-muted-foreground">Managed restaurants:</span>{" "}
              {user._count.managedRestaurants}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
