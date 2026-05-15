import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import {
  ToggleActiveBodySchema,
  UpdateRoleBodySchema,
} from "./admin.schema.js";
import * as adminController from "./admin.controller.js";

const router = Router();

router.use(authenticate, requireRole("SYSTEM_ADMIN"));

// Stats
router.get("/stats", adminController.getDashboardStats);

// Restaurants
router.get("/restaurants", adminController.getAllRestaurants);
router.get("/restaurants/:id", adminController.getRestaurantById);
router.post("/restaurants/:id/verify", adminController.verifyRestaurant);
router.patch("/restaurants/:id", adminController.updateRestaurant);
router.patch("/restaurants/:id/active", validate(ToggleActiveBodySchema), adminController.toggleRestaurantActive);

// Users
router.get("/users", adminController.getAllUsers);
router.get("/users/:id", adminController.getUserById);
router.patch("/users/:id/role", validate(UpdateRoleBodySchema), adminController.updateUserRole);

export default router;
