import { z } from "zod";

export const CreateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
  imageUrls: z.array(z.string().url()).max(3).default([]),
});

export const UpdateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(1000).optional().nullable(),
  imageUrls: z.array(z.string().url()).max(3).optional(),
});
