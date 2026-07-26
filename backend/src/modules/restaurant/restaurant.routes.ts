import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import {
  RestaurantQuerySchema,
  CreateRestaurantBodySchema,
  UpdateRestaurantBodySchema,
  AvailabilityQuerySchema,
} from "./restaurant.schema.js";
import * as restaurantController from "./restaurant.controller.js";

const router = Router();

router.get(
  "/",
  validate(RestaurantQuerySchema, "query"),
  restaurantController.getRestaurants,
);

router.get("/promotions", restaurantController.getAllActivePromotions);

router.get("/:id", restaurantController.getRestaurantById);

router.post(
  "/",
  authenticate,
  requireRole("RESTAURANT_ADMIN", "SYSTEM_ADMIN"),
  validate(CreateRestaurantBodySchema),
  restaurantController.createRestaurant,
);

router.put(
  "/:id",
  authenticate,
  requireRole("RESTAURANT_ADMIN", "SYSTEM_ADMIN"),
  validate(UpdateRestaurantBodySchema),
  restaurantController.updateRestaurant,
);

router.get(
  "/:id/availability",
  validate(AvailabilityQuerySchema, "query"),
  restaurantController.getAvailability,
);

router.get("/:id/menu", restaurantController.getMenu);
router.get("/:id/reviews", restaurantController.getRestaurantReviews);
router.get("/:id/promotions", restaurantController.getRestaurantPromotions);

export default router;
