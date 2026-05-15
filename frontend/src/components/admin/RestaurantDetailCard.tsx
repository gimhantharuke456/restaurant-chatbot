import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminRestaurantDetail } from "@/types/admin";

interface RestaurantDetailCardProps {
  restaurant: AdminRestaurantDetail;
}

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export function RestaurantDetailCard({ restaurant }: RestaurantDetailCardProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <span className="font-medium text-slate-500">Address:</span>{" "}
            {restaurant.address}
          </div>
          <div>
            <span className="font-medium text-slate-500">Area:</span>{" "}
            {restaurant.area}
          </div>
          {restaurant.phone && (
            <div>
              <span className="font-medium text-slate-500">Phone:</span>{" "}
              {restaurant.phone}
            </div>
          )}
          {restaurant.email && (
            <div>
              <span className="font-medium text-slate-500">Email:</span>{" "}
              {restaurant.email}
            </div>
          )}
          {restaurant.website && (
            <div>
              <span className="font-medium text-slate-500">Website:</span>{" "}
              <a
                href={restaurant.website}
                className="text-blue-600 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {restaurant.website}
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Opening Hours</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {DAYS.map((day) => (
            <div key={day} className="flex justify-between capitalize">
              <span className="font-medium text-slate-500">{day}</span>
              <span>
                {restaurant.openingHours[day] ?? (
                  <span className="text-slate-400">Closed</span>
                )}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Description</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700">
          {restaurant.description ?? (
            <span className="text-slate-400">No description</span>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
