import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import {
  CreateReservationBodySchema,
  UpdateReservationBodySchema,
} from "./reservation.schema.js";
import * as reservationController from "./reservation.controller.js";
import * as reviewController from "../review/review.controller.js";
import { CreateReviewSchema, UpdateReviewSchema } from "../review/review.schema.js";

const router = Router();

router.use(authenticate);

router.get("/", reservationController.getUserReservations);
router.get("/:id", reservationController.getReservationById);
router.post("/", validate(CreateReservationBodySchema), reservationController.createReservation);
router.put("/:id", validate(UpdateReservationBodySchema), reservationController.updateReservation);
router.delete("/:id", reservationController.cancelReservation);

// Review sub-routes
router.get("/:reservationId/review", reviewController.getReview);
router.post("/:reservationId/review", validate(CreateReviewSchema), reviewController.createReview);
router.put("/:reservationId/review", validate(UpdateReviewSchema), reviewController.updateReview);
router.delete("/:reservationId/review", reviewController.deleteReview);

export default router;
