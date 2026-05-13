import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { UpdateProfileBodySchema } from "./user.schema.js";
import * as userController from "./user.controller.js";

const router = Router();

router.get("/me", authenticate, userController.getProfile);
router.put(
  "/me",
  authenticate,
  validate(UpdateProfileBodySchema),
  userController.updateProfile,
);
router.get("/me/full", authenticate, userController.getProfileWithReservations);

export default router;
