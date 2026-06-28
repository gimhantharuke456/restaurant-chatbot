"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, EyeOff } from "lucide-react";
import { AdminReviewFull } from "@/types/admin";

interface AdminReviewsTableProps {
  reviews: AdminReviewFull[];
}

export function AdminReviewsTable({ reviews }: AdminReviewsTableProps) {
  const [items, setItems] = useState(reviews);

  const hideReview = async (id: string) => {
    const res = await fetch(`/api/proxy/admin/reviews/${id}/hide`, {
      method: "PATCH",
    });
    if (res.ok)
      setItems((prev) =>
        prev.map((r) => (r.id === id ? { ...r, isVisible: false } : r))
      );
  };

  const deleteReview = async (id: string) => {
    const res = await fetch(`/api/proxy/admin/reviews/${id}`, {
      method: "DELETE",
    });
    if (res.ok) setItems((prev) => prev.filter((r) => r.id !== id));
  };

  if (items.length === 0) {
    return (
      <div className="rounded-lg border bg-card py-16 text-center text-muted-foreground">
        No reviews found
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Customer</TableHead>
            <TableHead>Restaurant</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead>Comment</TableHead>
            <TableHead>Visible</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((review) => (
            <TableRow key={review.id}>
              <TableCell>
                <div className="text-sm font-medium">
                  {review.user.name ?? review.user.email}
                </div>
                <div className="text-xs text-muted-foreground">
                  {review.user.email}
                </div>
              </TableCell>
              <TableCell className="text-sm font-medium">
                {review.restaurant.name}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{review.rating} / 5</Badge>
              </TableCell>
              <TableCell className="max-w-xs">
                <p className="truncate text-sm">
                  {review.comment ?? (
                    <span className="text-muted-foreground">—</span>
                  )}
                </p>
              </TableCell>
              <TableCell>
                <Badge variant={review.isVisible ? "default" : "secondary"}>
                  {review.isVisible ? "Visible" : "Hidden"}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(review.createdAt).toLocaleDateString("en-LK")}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  {review.isVisible && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => hideReview(review.id)}
                    >
                      <EyeOff className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => deleteReview(review.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
