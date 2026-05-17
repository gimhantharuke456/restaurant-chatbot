"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { AuditLog } from "@/types/admin";

interface ExportLogsButtonProps {
  logs: AuditLog[];
}

export function ExportLogsButton({ logs }: ExportLogsButtonProps) {
  const handleExport = () => {
    const headers = [
      "Date",
      "Admin",
      "Action",
      "Target Type",
      "Target ID",
      "Details",
      "IP",
    ];

    const rows = logs.map((log) => [
      new Date(log.createdAt).toISOString(),
      log.adminEmail,
      log.action,
      log.targetType,
      log.targetId ?? "",
      log.details ?? "",
      log.ipAddress ?? "",
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admin-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" onClick={handleExport}>
      <Download className="mr-2 h-4 w-4" />
      Export CSV
    </Button>
  );
}
