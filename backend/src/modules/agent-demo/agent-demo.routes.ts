import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { DemoChatBodySchema } from "./agent-demo.schema.js";
import * as agentDemoController from "./agent-demo.controller.js";

const router = Router();

// Public, unauthenticated — powers the agent-demo dashboard shown to
// research instructors. Does not forward any auth token to the AI service,
// so reservation/payment actions surface their real "sign in required"
// branch instead of mutating data.
router.post("/chat", validate(DemoChatBodySchema), agentDemoController.postMessage);

export default router;
