import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { RegisterBodySchema, UpdateProfileBodySchema } from "./auth.schema.js";
import * as authController from "./auth.controller.js";

const router = Router();

router.post("/register", validate(RegisterBodySchema), authController.register);
router.get("/me", authenticate, authController.getMe);
router.put(
  "/profile",
  authenticate,
  validate(UpdateProfileBodySchema),
  authController.updateProfile,
);

export default router;
