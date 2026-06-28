import { HolidayManager } from "@/components/restaurant-portal/HolidayManager";

export default function PortalHolidaysPage() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Holidays</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Mark dates when your restaurant will be closed. Reservations won&apos;t be accepted on these days.
        </p>
      </div>
      <HolidayManager />
    </div>
  );
}
