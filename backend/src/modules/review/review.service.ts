import { prisma } from "../../../lib/db.js";
import type { z } from "zod";
import type { CreateReviewSchema, UpdateReviewSchema } from "./review.schema.js";

type CreateInput = z.infer<typeof CreateReviewSchema>;
type UpdateInput = z.infer<typeof UpdateReviewSchema>;

export const getReviewForReservation = async (reservationId: string, userId: string) => {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId, userId },
    include: { review: true },
  });
  if (!reservation) throw Object.assign(new Error("Reservation not found"), { status: 404 });
  return reservation.review;
};

export const createReview = async (reservationId: string, userId: string, input: CreateInput) => {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId, userId },
  });
  if (!reservation) throw Object.assign(new Error("Reservation not found"), { status: 404 });
  if (reservation.status !== "COMPLETED")
    throw Object.assign(new Error("Can only review completed reservations"), { status: 400 });

  const existing = await prisma.review.findUnique({ where: { reservationId } });
  if (existing) throw Object.assign(new Error("Review already exists"), { status: 409 });

  const review = await prisma.review.create({
    data: {
      userId,
      restaurantId: reservation.restaurantId,
      reservationId,
      rating: input.rating,
      comment: input.comment ?? null,
      imageUrls: JSON.stringify(input.imageUrls),
    },
  });

  await recalcRestaurantRating(reservation.restaurantId);
  return review;
};

export const updateReview = async (reservationId: string, userId: string, input: UpdateInput) => {
  const review = await prisma.review.findUnique({
    where: { reservationId },
    include: { reservation: { select: { userId: true, restaurantId: true } } },
  });
  if (!review) throw Object.assign(new Error("Review not found"), { status: 404 });
  if (review.userId !== userId) throw Object.assign(new Error("Forbidden"), { status: 403 });

  const updated = await prisma.review.update({
    where: { reservationId },
    data: {
      ...(input.rating !== undefined ? { rating: input.rating } : {}),
      ...(input.comment !== undefined ? { comment: input.comment } : {}),
      ...(input.imageUrls !== undefined ? { imageUrls: JSON.stringify(input.imageUrls) } : {}),
    },
  });

  await recalcRestaurantRating(review.restaurantId);
  return updated;
};

export const deleteReview = async (reservationId: string, userId: string) => {
  const review = await prisma.review.findUnique({
    where: { reservationId },
    include: { reservation: { select: { restaurantId: true } } },
  });
  if (!review) throw Object.assign(new Error("Review not found"), { status: 404 });
  if (review.userId !== userId) throw Object.assign(new Error("Forbidden"), { status: 403 });
  await prisma.review.delete({ where: { reservationId } });
  await recalcRestaurantRating(review.restaurantId);
};

const recalcRestaurantRating = async (restaurantId: string) => {
  const agg = await prisma.review.aggregate({
    where: { restaurantId },
    _avg: { rating: true },
    _count: { id: true },
  });
  await prisma.restaurant.update({
    where: { id: restaurantId },
    data: {
      avgRating: agg._avg.rating,
      totalReviews: agg._count.id,
    },
  });
};
