import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

interface DashboardAlertsProps {
  verificationPending: number;
}

export function DashboardAlerts({ verificationPending }: DashboardAlertsProps) {
  if (verificationPending === 0) return null;

  return (
    <Alert className="border-orange-200 bg-orange-50">
      <AlertCircle className="h-4 w-4 text-orange-600" />
      <AlertTitle className="text-orange-800">Action Required</AlertTitle>
      <AlertDescription className="text-orange-700">
        {verificationPending} restaurant{verificationPending > 1 ? "s are" : " is"} pending
        verification.{" "}
        <Link href="/admin/verification" className="underline font-medium">
          Review now →
        </Link>
      </AlertDescription>
    </Alert>
  );
}
