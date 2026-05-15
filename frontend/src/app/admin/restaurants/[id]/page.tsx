import { serverFetch } from "@/lib/server/api";
import { PageHeader } from "@/components/admin/PageHeader";
import { RestaurantDetailCard } from "@/components/admin/RestaurantDetailCard";
import { RestaurantEditForm } from "@/components/admin/RestaurantEditForm";
import { MenuItemsTable } from "@/components/admin/MenuItemsTable";
import { ReviewsTable } from "@/components/admin/ReviewsTable";
import { VerifyRestaurantButton } from "@/components/admin/VerifyRestaurantButton";
import { ToggleRestaurantButton } from "@/components/admin/ToggleRestaurantButton";
import { TabPanel } from "@/components/admin/TabPanel";
import { AdminRestaurantDetail } from "@/types/admin";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default async function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const restaurant = await serverFetch<AdminRestaurantDetail>(
    `admin/restaurants/${id}`
  );

  return (
    <div>
      <PageHeader
        title={restaurant.name}
        description={`${restaurant.area} · ${restaurant.cuisineTypes.join(", ")}`}
        actions={
          <div className="flex items-center gap-3">
            <Link href="/admin/restaurants">
              <Button variant="ghost" size="sm">
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
            </Link>
            <ToggleRestaurantButton
              id={restaurant.id}
              isActive={restaurant.isActive}
            />
            <VerifyRestaurantButton
              id={restaurant.id}
              isVerified={restaurant.isVerified}
            />
          </div>
        }
      />

      <div className="p-8">
        <TabPanel
          tabs={[
            {
              value: "details",
              label: "Details",
              content: <RestaurantDetailCard restaurant={restaurant} />,
            },
            {
              value: "edit",
              label: "Edit",
              content: <RestaurantEditForm restaurant={restaurant} />,
            },
            {
              value: "menu",
              label: `Menu (${restaurant.menuItems.length})`,
              content: <MenuItemsTable items={restaurant.menuItems} />,
            },
            {
              value: "reviews",
              label: `Reviews (${restaurant.reviews.length})`,
              content: (
                <ReviewsTable
                  reviews={restaurant.reviews}
                  restaurantId={restaurant.id}
                />
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
