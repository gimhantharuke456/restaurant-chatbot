import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle2, XCircle, Eye } from "lucide-react";
import { ToggleRestaurantButton } from "./ToggleRestaurantButton";
import { AdminRestaurant } from "@/types/admin";

interface RestaurantTableProps {
  restaurants: AdminRestaurant[];
}

const PRICE_LABELS: Record<string, string> = {
  BUDGET: "Budget",
  MODERATE: "Moderate",
  EXPENSIVE: "Expensive",
  FINE_DINING: "Fine Dining",
};

export function RestaurantTable({ restaurants }: RestaurantTableProps) {
  if (restaurants.length === 0) {
    return (
      <div className="rounded-lg border bg-white py-16 text-center text-slate-400">
        No restaurants found
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead>Name</TableHead>
            <TableHead>Area</TableHead>
            <TableHead>Cuisines</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead>Verified</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {restaurants.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <div className="font-medium">{r.name}</div>
                <div className="text-xs text-slate-400">{r.admin.email}</div>
              </TableCell>
              <TableCell className="text-sm">{r.area}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {r.cuisineTypes.slice(0, 2).map((c) => (
                    <Badge key={c} variant="secondary" className="text-xs">
                      {c}
                    </Badge>
                  ))}
                  {r.cuisineTypes.length > 2 && (
                    <Badge variant="secondary" className="text-xs">
                      +{r.cuisineTypes.length - 2}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-sm">
                {PRICE_LABELS[r.priceRange]}
              </TableCell>
              <TableCell className="text-sm">
                {r.avgRating != null ? (
                  <span className="font-medium">
                    {r.avgRating.toFixed(1)} ⭐
                  </span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </TableCell>
              <TableCell>
                {r.isVerified ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-slate-300" />
                )}
              </TableCell>
              <TableCell>
                <Badge variant={r.isActive ? "default" : "destructive"}>
                  {r.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Link href={`/admin/restaurants/${r.id}`}>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  <ToggleRestaurantButton
                    id={r.id}
                    isActive={r.isActive}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
