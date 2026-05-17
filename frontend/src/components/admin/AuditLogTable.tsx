import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AuditLog } from "@/types/admin";

interface AuditLogTableProps {
  logs: AuditLog[];
}

const ACTION_BADGE: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  VERIFY: "default",
  UPDATE: "secondary",
  DELETE: "destructive",
  ROLE_CHANGE: "outline",
  TOGGLE: "secondary",
  REFUND: "destructive",
  SETTINGS_UPDATE: "secondary",
};

export function AuditLogTable({ logs }: AuditLogTableProps) {
  if (logs.length === 0) {
    return (
      <div className="rounded-lg border bg-white py-16 text-center text-slate-400">
        No audit logs yet
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead>Date & Time</TableHead>
            <TableHead>Admin</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Target</TableHead>
            <TableHead>Details</TableHead>
            <TableHead>IP</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="whitespace-nowrap text-sm text-slate-500">
                {new Date(log.createdAt).toLocaleString("en-LK")}
              </TableCell>
              <TableCell className="text-sm">{log.adminEmail}</TableCell>
              <TableCell>
                <Badge variant={ACTION_BADGE[log.action] ?? "outline"}>
                  {log.action}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">
                <span className="font-medium">{log.targetType}</span>
                {log.targetId && (
                  <code className="ml-2 rounded bg-slate-100 px-1 text-xs text-slate-500">
                    {log.targetId.slice(0, 8)}…
                  </code>
                )}
              </TableCell>
              <TableCell className="max-w-xs text-sm text-slate-500">
                {log.details ?? "—"}
              </TableCell>
              <TableCell className="text-xs text-slate-400">
                {log.ipAddress ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
