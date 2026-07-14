import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { SendMessageBodySchema } from "./chat.schema.js";
import * as chatController from "./chat.controller.js";

const router = Router();

// Guest endpoint — no auth required; backend enforces the 3-message limit server-side per sessionId
router.post("/guest", validate(SendMessageBodySchema), chatController.sendGuestMessage);

router.use(authenticate);

router.post("/message", validate(SendMessageBodySchema), chatController.sendMessage);
router.get("/history", chatController.getHistory);
router.delete("/session/:id", chatController.clearSession);

export default router;
