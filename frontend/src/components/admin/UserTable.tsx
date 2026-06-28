import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { Eye } from "lucide-react";
import { UserRoleSelect } from "./UserRoleSelect";
import { SuspendUserButton } from "./SuspendUserButton";
import { AdminUser } from "@/types/admin";

interface UserTableProps {
  users: AdminUser[];
}

const ROLE_BADGE: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  CUSTOMER: "secondary",
  RESTAURANT_ADMIN: "default",
  SYSTEM_ADMIN: "destructive",
};

export function UserTable({ users }: UserTableProps) {
  if (users.length === 0) {
    return (
      <div className="rounded-lg border bg-card py-16 text-center text-muted-foreground">
        No users found
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Reservations</TableHead>
            <TableHead>Reviews</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Change Role</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatarUrl ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {(user.name ?? user.email).slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium">
                      {user.name ?? "(no name)"}
                    </div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={ROLE_BADGE[user.role] ?? "outline"}>
                  {user.role.replace("_", " ")}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={user.isActive ? "default" : "secondary"}>
                  {user.isActive ? "Active" : "Suspended"}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">
                {user._count.reservations}
              </TableCell>
              <TableCell className="text-sm">{user._count.reviews}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(user.createdAt).toLocaleDateString("en-LK")}
              </TableCell>
              <TableCell>
                <UserRoleSelect userId={user.id} currentRole={user.role} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <SuspendUserButton userId={user.id} isActive={user.isActive} />
                  <Link href={`/admin/users/${user.id}`}>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
