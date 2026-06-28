import { serverFetch } from "@/lib/server/api";
import { PromotionsClient } from "@/components/restaurant-portal/PromotionsClient";

interface Promotion {
  id: string;
  title: string;
  description: string;
  type: string;
  discountValue: number | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  imageUrl: string | null;
}

export default async function PortalPromotionsPage() {
  const promotions = await serverFetch<Promotion[]>(
    "restaurant-portal/promotions"
  ).catch(() => []);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Promotions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage discounts, events and special offers
        </p>
      </div>
      <PromotionsClient initial={promotions} />
    </div>
  );
}
