"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReservationStatusFilterProps {
  currentStatus?: string;
}

export function ReservationStatusFilter({
  currentStatus,
}: ReservationStatusFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("status");
    } else {
      params.set("status", value);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Select defaultValue={currentStatus ?? "all"} onValueChange={handleChange}>
      <SelectTrigger className="w-44">
        <SelectValue placeholder="All statuses" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All statuses</SelectItem>
        <SelectItem value="PENDING">Pending</SelectItem>
        <SelectItem value="CONFIRMED">Confirmed</SelectItem>
        <SelectItem value="COMPLETED">Completed</SelectItem>
        <SelectItem value="CANCELLED">Cancelled</SelectItem>
        <SelectItem value="NO_SHOW">No Show</SelectItem>
      </SelectContent>
    </Select>
  );
}
