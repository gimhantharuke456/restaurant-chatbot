"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AdminReview } from "@/types/admin";
import { useState } from "react";
import { Trash2 } from "lucide-react";

interface ReviewsTableProps {
  reviews: AdminReview[];
  restaurantId: string;
}

export function ReviewsTable({ reviews, restaurantId }: ReviewsTableProps) {
  const [items, setItems] = useState(reviews);

  const deleteReview = async (id: string) => {
    const res = await fetch(
      `/api/proxy/admin/restaurants/${restaurantId}/reviews/${id}`,
      { method: "DELETE" }
    );
    if (res.ok) setItems((prev) => prev.filter((r) => r.id !== id));
  };

  if (items.length === 0) {
    return <p className="py-8 text-center text-slate-400">No reviews yet</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead>User</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead>Comment</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((review) => (
            <TableRow key={review.id}>
              <TableCell>
                <div className="text-sm font-medium">
                  {review.user.name ?? review.user.email}
                </div>
              </TableCell>
              <TableCell>{"⭐".repeat(review.rating)}</TableCell>
              <TableCell className="max-w-xs">
                <p className="truncate text-sm">
                  {review.comment ?? <span className="text-slate-400">—</span>}
                </p>
              </TableCell>
              <TableCell className="text-sm text-slate-500">
                {new Date(review.createdAt).toLocaleDateString("en-LK")}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700"
                  onClick={() => deleteReview(review.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
