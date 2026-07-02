import { Router } from "express";
import { checkUsername, getMe, getUserProfile } from "../controllers/user";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.get("/check-username", checkUsername);
router.get("/me", authenticate, getMe);
router.get("/profile/:userId", authenticate, getUserProfile);

export default router;