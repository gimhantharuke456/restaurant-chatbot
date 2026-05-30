import { Suspense } from "react";
import { serverFetch } from "@/lib/server/api";
import { PaginationBar } from "@/components/admin/PaginationBar";
import { ReservationStatusSelect } from "@/components/restaurant-portal/ReservationStatusSelect";
import { ReservationCalendar } from "@/components/restaurant-portal/ReservationCalendar";

interface Reservation {
  id: string;
  date: string;
  time: string;
  partySize: number;
  specialRequests: string | null;
  status: string;
  user: { name: string | null; email: string; phone: string | null };
}

interface PaginatedReservations {
  data: Reservation[];
  total: number;
  page: number;
  limit: number;
}

interface SearchParams { page?: string; status?: string; view?: string }

export default async function PortalReservationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { page: pageParam, status, view = "calendar" } = await searchParams;
  const page = Number(pageParam ?? 1);
  const limit = 25;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(status ? { status } : {}),
  });

  const result = await serverFetch<PaginatedReservations>(
    `restaurant-portal/reservations?${params.toString()}`
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Reservations</h1>
          <p className="text-sm text-slate-500 mt-1">{result.total} total</p>
        </div>

        <div className="flex rounded-lg border bg-white overflow-hidden text-sm font-medium">
          <a
            href="?view=calendar"
            className={`px-4 py-2 transition-colors ${view === "calendar" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
          >
            Calendar
          </a>
          <a
            href="?view=list"
            className={`px-4 py-2 transition-colors ${view === "list" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
          >
            List
          </a>
        </div>
      </div>

      {view === "calendar" && <ReservationCalendar />}

      {view === "list" && (
        <>
          <div className="overflow-hidden rounded-lg border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Guest</th>
                  <th className="px-4 py-3 text-left font-medium">Date & Time</th>
                  <th className="px-4 py-3 text-left font-medium">Party</th>
                  <th className="px-4 py-3 text-left font-medium">Special Requests</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {result.data.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                      No reservations found
                    </td>
                  </tr>
                ) : (
                  result.data.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.user.name ?? "—"}</div>
                        <div className="text-xs text-slate-400">{r.user.email}</div>
                        {r.user.phone && (
                          <div className="text-xs text-slate-400">{r.user.phone}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div>{new Date(r.date).toLocaleDateString()}</div>
                        <div className="text-slate-400">{r.time}</div>
                      </td>
                      <td className="px-4 py-3">{r.partySize}</td>
                      <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                        {r.specialRequests ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <ReservationStatusSelect
                          reservationId={r.id}
                          currentStatus={r.status}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Suspense>
            <PaginationBar page={page} total={result.total} limit={limit} />
          </Suspense>
        </>
      )}
    </div>
  );
}
