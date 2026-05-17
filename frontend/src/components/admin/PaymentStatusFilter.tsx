"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PaymentStatusFilter({
  currentStatus,
}: {
  currentStatus?: string;
}) {
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
        <SelectItem value="all">All payments</SelectItem>
        <SelectItem value="SUCCEEDED">Succeeded</SelectItem>
        <SelectItem value="PENDING">Pending</SelectItem>
        <SelectItem value="FAILED">Failed</SelectItem>
        <SelectItem value="REFUNDED">Refunded</SelectItem>
      </SelectContent>
    </Select>
  );
}
