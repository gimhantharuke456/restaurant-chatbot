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
import { Eye } from "lucide-react";
import { VerifyRestaurantButton } from "./VerifyRestaurantButton";
import { AdminRestaurant } from "@/types/admin";

interface VerificationTableProps {
  restaurants: AdminRestaurant[];
}

export function VerificationTable({ restaurants }: VerificationTableProps) {
  if (restaurants.length === 0) {
    return (
      <div className="rounded-lg border bg-white py-16 text-center text-slate-400">
        No restaurants pending verification
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
            <TableHead>Admin</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {restaurants.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <div className="font-medium">{r.name}</div>
                <div className="text-xs text-slate-400">{r.createdAt.slice(0, 10)}</div>
              </TableCell>
              <TableCell className="text-sm">{r.area}</TableCell>
              <TableCell className="text-sm">{r.admin.email}</TableCell>
              <TableCell>
                <Badge variant="secondary" className="text-xs">
                  {r.priceRange.replace("_", " ")}
                </Badge>
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
                  <VerifyRestaurantButton id={r.id} isVerified={r.isVerified} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
