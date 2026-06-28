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
    return <p className="py-8 text-center text-muted-foreground">No reviews yet</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
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
                <div className="text-sm font-medium text-foreground">
                  {review.user.name ?? review.user.email}
                </div>
              </TableCell>
              <TableCell>{"⭐".repeat(review.rating)}</TableCell>
              <TableCell className="max-w-xs">
                <p className="truncate text-sm text-foreground">
                  {review.comment ?? <span className="text-muted-foreground">—</span>}
                </p>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
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
