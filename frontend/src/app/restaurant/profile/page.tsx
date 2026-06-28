import { serverFetch } from "@/lib/server/api";
import { Badge } from "@/components/ui/badge";
import { RestaurantImageManager } from "@/components/restaurant-portal/RestaurantImageManager";
import { Building2 } from "lucide-react";

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
  imageUrls: string[];
  profileImageUrl: string | null;
  coverImageUrl: string | null;
  priceRange: string;
  isActive: boolean;
  isVerified: boolean;
  avgRating: number | null;
  totalReviews: number;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground sm:col-span-2 sm:mt-0">{value}</dd>
    </div>
  );
}

export default async function PortalProfilePage() {
  let r: MyRestaurant | null = null;
  try {
    r = await serverFetch<MyRestaurant>("restaurant-portal/restaurant");
  } catch {
    // no restaurant associated yet
  }

  if (!r) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-foreground mb-8">My Restaurant</h1>
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-20 text-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-foreground">No restaurant linked</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your account hasn't been assigned to a restaurant yet.
              <br />Contact the platform admin to get set up.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">My Restaurant</h1>
        <p className="text-sm text-muted-foreground mt-1">{r.name}</p>
      </div>

      {/* Photos */}
      <div className="rounded-lg border bg-card p-6 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Restaurant Images</h2>
        <p className="text-xs text-muted-foreground">
          Upload a profile logo, a cover banner, and additional gallery photos for customers.
        </p>
        <RestaurantImageManager
          initialImages={Array.isArray(r.imageUrls) ? r.imageUrls : []}
          initialProfileImageUrl={r.profileImageUrl ?? null}
          initialCoverImageUrl={r.coverImageUrl ?? null}
        />
      </div>

      {/* Details */}
      <div className="overflow-hidden rounded-lg border bg-card">
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
