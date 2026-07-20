import { Router } from "express";
import { checkUsername, getMe, getUserProfile, updateUserProfile } from "../user/user.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";
import { checkUsernameSchema, updateUserProfileSchema } from "./user.schema";

const router = Router();

router.get("/check_username", validate(checkUsernameSchema), checkUsername);
router.get("/me", authenticate, getMe);
router.get("/profile/:userId", authenticate, getUserProfile);
router.patch("/update_profile", authenticate, validate(updateUserProfileSchema), updateUserProfile);

export default router;