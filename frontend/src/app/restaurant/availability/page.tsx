import { AvailabilityManager } from "@/components/restaurant-portal/AvailabilityManager";

export default function PortalAvailabilityPage() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Availability</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage time slots and table availability per day
        </p>
      </div>
      <AvailabilityManager />
    </div>
  );
}
