import { serverFetch } from "@/lib/server/api";
import { ReservationList } from "@/components/customer/ReservationList";
import type { Reservation } from "@/components/customer/ReservationCard";

export default async function ReservationsPage() {
  const reservations = await serverFetch<Reservation[]>("reservations").catch(() => []);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-semibold mb-6">My Reservations</h1>
        <ReservationList initial={reservations} />
      </div>
    </div>
  );
}
