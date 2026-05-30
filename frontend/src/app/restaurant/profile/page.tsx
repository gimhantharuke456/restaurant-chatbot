import { serverFetch } from "@/lib/server/api";
import { Badge } from "@/components/ui/badge";

interface MyRestaurant {
  id: string;
  name: string;
  description: string | null;
  address: string;
  area: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  cuisineTypes: string[];
  priceRange: string;
  isActive: boolean;
  isVerified: boolean;
  avgRating: number | null;
  totalReviews: number;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900 sm:col-span-2 sm:mt-0">{value}</dd>
    </div>
  );
}

export default async function PortalProfilePage() {
  const r = await serverFetch<MyRestaurant>("restaurant-portal/restaurant");

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">My Restaurant</h1>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <dl className="divide-y px-6">
          <Field label="Name" value={r.name} />
          <Field label="Description" value={r.description ?? "—"} />
          <Field label="Address" value={r.address} />
          <Field label="Area" value={r.area} />
          <Field label="Phone" value={r.phone ?? "—"} />
          <Field label="Email" value={r.email ?? "—"} />
          <Field label="Website" value={r.website ?? "—"} />
          <Field
            label="Cuisine Types"
            value={
              <div className="flex flex-wrap gap-1">
                {r.cuisineTypes.map((c) => (
                  <Badge key={c} variant="secondary">{c}</Badge>
                ))}
              </div>
            }
          />
          <Field label="Price Range" value={r.priceRange.replace("_", " ")} />
          <Field
            label="Status"
            value={
              <div className="flex gap-2">
                <Badge variant={r.isActive ? "default" : "destructive"}>
                  {r.isActive ? "Active" : "Inactive"}
                </Badge>
                <Badge variant={r.isVerified ? "default" : "secondary"}>
                  {r.isVerified ? "Verified" : "Unverified"}
                </Badge>
              </div>
            }
          />
          <Field
            label="Rating"
            value={r.avgRating != null ? `${r.avgRating.toFixed(1)} ⭐ (${r.totalReviews} reviews)` : "No ratings yet"}
          />
        </dl>
      </div>
    </div>
  );
}
