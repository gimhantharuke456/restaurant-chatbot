import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import {
  VerifyRestaurantBodySchema,
  ToggleActiveBodySchema,
  UpdateRoleBodySchema,
} from "./admin.schema.js";
import * as adminController from "./admin.controller.js";

const router = Router();

router.use(authenticate, requireRole("SYSTEM_ADMIN"));

router.get("/stats", adminController.getDashboardStats);
router.get("/restaurants", adminController.getAllRestaurants);
router.patch("/restaurants/:id/verify", validate(VerifyRestaurantBodySchema), adminController.verifyRestaurant);
router.patch("/restaurants/:id/active", validate(ToggleActiveBodySchema), adminController.toggleRestaurantActive);
router.get("/users", adminController.getAllUsers);
router.patch("/users/:id/role", validate(UpdateRoleBodySchema), adminController.updateUserRole);

export default router;
