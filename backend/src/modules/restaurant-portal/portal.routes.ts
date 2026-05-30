import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth.js";
import * as portalController from "./portal.controller.js";

const router = Router();

router.use(authenticate, requireRole("RESTAURANT_ADMIN"));

router.get("/stats", portalController.getMyStats);
router.get("/restaurant", portalController.getMyRestaurant);

router.get("/reservations", portalController.getMyReservations);
router.patch("/reservations/:id/status", portalController.updateReservationStatus);

router.get("/menu", portalController.getMyMenu);
router.post("/menu", portalController.createMenuItem);
router.patch("/menu/:id", portalController.updateMenuItem);
router.delete("/menu/:id", portalController.deleteMenuItem);

export default router;
