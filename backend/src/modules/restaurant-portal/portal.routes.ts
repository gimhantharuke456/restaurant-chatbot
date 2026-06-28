import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth.js";
import * as portalController from "./portal.controller.js";

const router = Router();

router.use(authenticate, requireRole("RESTAURANT_ADMIN"));

router.post("/restaurant", portalController.registerRestaurant);
router.get("/restaurant", portalController.getMyRestaurant);
router.patch("/restaurant", portalController.updateMyRestaurant);

router.get("/stats", portalController.getMyStats);
router.get("/analytics", portalController.getPortalAnalytics);

router.get("/reservations", portalController.getMyReservations);
router.patch("/reservations/:id/status", portalController.updateReservationStatus);
router.patch("/reservations/:id/checkin", portalController.checkInReservation);

router.get("/reviews", portalController.getMyReviews);
router.post("/reviews/:id/reply", portalController.replyToReview);
router.put("/reviews/:id/reply", portalController.replyToReview);

router.get("/payments", portalController.getMyPayments);

router.get("/menu", portalController.getMyMenu);
router.post("/menu", portalController.createMenuItem);
router.patch("/menu/:id", portalController.updateMenuItem);
router.delete("/menu/:id", portalController.deleteMenuItem);

router.get("/availability/:date", portalController.getAvailabilityForDate);
router.put("/availability/:date", portalController.setAvailabilityForDate);

router.get("/promotions", portalController.getMyPromotions);
router.post("/promotions", portalController.createPromotion);
router.put("/promotions/:id", portalController.updatePromotion);
router.delete("/promotions/:id", portalController.deletePromotion);

router.post("/ai/message", portalController.askPortalAI);

router.get("/holidays", portalController.getMyHolidays);
router.post("/holidays", portalController.addHoliday);
router.delete("/holidays/:date", portalController.removeHoliday);

export default router;
