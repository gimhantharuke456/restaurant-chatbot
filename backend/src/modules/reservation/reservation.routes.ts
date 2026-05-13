import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import {
  CreateReservationBodySchema,
  UpdateReservationBodySchema,
} from "./reservation.schema.js";
import * as reservationController from "./reservation.controller.js";

const router = Router();

router.use(authenticate);

router.get("/", reservationController.getUserReservations);
router.post("/", validate(CreateReservationBodySchema), reservationController.createReservation);
router.put("/:id", validate(UpdateReservationBodySchema), reservationController.updateReservation);
router.delete("/:id", reservationController.cancelReservation);

export default router;
