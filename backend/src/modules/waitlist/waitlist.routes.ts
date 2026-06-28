import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import * as waitlistController from "./waitlist.controller.js";

const router = Router();

router.use(authenticate);

router.post("/", waitlistController.joinWaitlist);
router.get("/", waitlistController.getMyWaitlist);
router.delete("/:id", waitlistController.leaveWaitlist);

export default router;
