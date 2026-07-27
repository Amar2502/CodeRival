import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import {
  createTournamentController,
  getTournamentDetailsController,
  inviteFriendsController,
  acceptInviteController,
  getUserTournamentsController,
  getUserInvitesController,
  cancelTournamentController,
} from "./tournament.controller";

const router = Router();

router.use(authenticate);

router.post("/create", createTournamentController);
router.get("/list", getUserTournamentsController);
router.get("/invites", getUserInvitesController);
router.get("/:id", getTournamentDetailsController);
router.post("/:id/invite", inviteFriendsController);
router.post("/:id/accept", acceptInviteController);
router.post("/:id/cancel", cancelTournamentController);

export default router;
