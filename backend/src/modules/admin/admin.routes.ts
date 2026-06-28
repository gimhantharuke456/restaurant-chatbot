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

// Settings
router.get("/settings", adminController.getSettings);
router.patch("/settings", adminController.updateSettings);

// Audit logs
router.get("/logs", adminController.getLogs);

// Restaurants
router.get("/restaurants", adminController.getAllRestaurants);
router.get("/restaurants/:id", adminController.getRestaurantById);
router.post("/restaurants/:id/verify", adminController.verifyRestaurant);
router.patch("/restaurants/:id", adminController.updateRestaurant);
router.patch("/restaurants/:id/active", validate(ToggleActiveBodySchema), adminController.toggleRestaurantActive);

// Analytics
router.get("/analytics/reservations", adminController.getAnalyticsReservations);
router.get("/analytics/revenue", adminController.getAnalyticsRevenue);
router.get("/analytics/cuisines", adminController.getAnalyticsCuisines);
router.get("/analytics/users", adminController.getAnalyticsUsers);
router.get("/analytics/reservation-status", adminController.getAnalyticsReservationStatus);

// Reservations
router.get("/reservations", adminController.getAllReservations);

// Payments
router.get("/payments", adminController.getAllPayments);
router.get("/payments/summary", adminController.getPaymentSummary);

// Users
router.get("/users", adminController.getAllUsers);
router.get("/users/:id", adminController.getUserById);
router.patch("/users/:id/role", validate(UpdateRoleBodySchema), adminController.updateUserRole);
router.patch("/users/:id/suspend", adminController.suspendUser);
router.patch("/users/:id/activate", adminController.activateUser);

// Reviews
router.get("/reviews", adminController.getAllReviews);
router.patch("/reviews/:id/hide", adminController.hideReview);
router.delete("/reviews/:id", adminController.deleteReview);

// Payment refund
router.post("/payments/:id/refund", adminController.refundPayment);

// Announcements
router.post("/notifications", adminController.broadcastAnnouncement);

export default router;
