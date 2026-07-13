import { Router } from "express";
import { checkUsername, getMe, getUserProfile, updateUserProfile } from "../controllers/user.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.get("/check_username", checkUsername);
router.get("/me", authenticate, getMe);
router.get("/profile/:userId", authenticate, getUserProfile);
router.patch("/update_profile", authenticate, updateUserProfile);

export default router;