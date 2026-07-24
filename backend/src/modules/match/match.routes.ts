import { Router } from "express";
import { MatchController } from "./match.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();

router.get("/history/me", authenticate, MatchController.getUserMatchHistory);
router.get("/active", authenticate, MatchController.getActiveMatch);
router.get("/:id", authenticate, MatchController.getMatchById);

export default router;
