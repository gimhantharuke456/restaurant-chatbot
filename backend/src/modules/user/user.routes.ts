import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import * as userController from "./user.controller.js";

const router = Router();

router.use(authenticate);

router.get("/me", userController.getProfile);
router.put("/me", userController.updateProfile);
router.get("/me/full", userController.getProfileWithReservations);
router.delete("/me", userController.deleteAccount);

router.get("/me/preferences", userController.getPreferences);
router.put("/me/preferences", userController.updatePreferences);

router.get("/me/favorites", userController.getFavorites);
router.post("/me/favorites", userController.addFavorite);
router.delete("/me/favorites/:restaurantId", userController.removeFavorite);
router.get("/me/favorites/:restaurantId/check", userController.checkFavorite);

router.get("/me/reviews", userController.getUserReviews);

router.get("/me/notifications", userController.getNotifications);
router.patch("/me/notifications/read-all", userController.markAllNotificationsRead);
router.patch("/me/notifications/:id/read", userController.markNotificationRead);

router.get("/me/insights", userController.getUserInsights);

router.post("/me/complaints", userController.createComplaint);
router.get("/me/complaints", userController.getMyComplaints);

export default router;
