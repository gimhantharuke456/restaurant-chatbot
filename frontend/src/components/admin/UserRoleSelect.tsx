"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserRole } from "@/types/admin";

interface UserRoleSelectProps {
  userId: string;
  currentRole: UserRole;
}

const ROLES: UserRole[] = ["CUSTOMER", "RESTAURANT_ADMIN", "SYSTEM_ADMIN"];

const ROLE_LABELS: Record<UserRole, string> = {
  CUSTOMER: "Customer",
  RESTAURANT_ADMIN: "Restaurant Admin",
  SYSTEM_ADMIN: "System Admin",
};

export function UserRoleSelect({ userId, currentRole }: UserRoleSelectProps) {
  const [role, setRole] = useState<UserRole>(currentRole);
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);
  const [saving, setSaving] = useState(false);

  const handleValueChange = (value: string) => {
    setPendingRole(value as UserRole);
  };

  const confirmChange = async () => {
    if (!pendingRole) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/proxy/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: pendingRole }),
      });
      if (res.ok) setRole(pendingRole);
    } finally {
      setSaving(false);
      setPendingRole(null);
    }
  };

  return (
    <>
      <Select
        value={role}
        onValueChange={handleValueChange}
        disabled={saving}
      >
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ROLES.map((r) => (
            <SelectItem key={r} value={r}>
              {ROLE_LABELS[r]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <AlertDialog
        open={pendingRole !== null}
        onOpenChange={(o) => !o && setPendingRole(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change user role?</AlertDialogTitle>
            <AlertDialogDescription>
              This will change the user&apos;s role to{" "}
              <strong>{pendingRole ? ROLE_LABELS[pendingRole] : ""}</strong>.
              This affects what they can access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmChange}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
