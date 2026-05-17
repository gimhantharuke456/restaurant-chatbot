"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserRoleFilterProps {
  currentRole?: string;
}

export function UserRoleFilter({ currentRole }: UserRoleFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("role");
    } else {
      params.set("role", value);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Select
      defaultValue={currentRole ?? "all"}
      onValueChange={handleChange}
    >
      <SelectTrigger className="w-48">
        <SelectValue placeholder="All roles" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All roles</SelectItem>
        <SelectItem value="CUSTOMER">Customer</SelectItem>
        <SelectItem value="RESTAURANT_ADMIN">Restaurant Admin</SelectItem>
        <SelectItem value="SYSTEM_ADMIN">System Admin</SelectItem>
      </SelectContent>
    </Select>
  );
}
