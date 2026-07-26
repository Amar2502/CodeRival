import { Router } from "express";
import {
  checkUsername,
  getMe,
  getUserProfile,
  updateUserProfile,
  verifyEmail,
  linkOAuth,
} from "../user/user.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";
import { checkUsernameSchema, updateUserProfileSchema } from "./user.schema";

const router = Router();

router.get("/check_username", validate(checkUsernameSchema), checkUsername);
router.get("/me", authenticate, getMe);
router.get("/profile/:userId", authenticate, getUserProfile);
router.patch(
  "/update_profile",
  authenticate,
  validate(updateUserProfileSchema),
  updateUserProfile
);
router.post("/verify_email", authenticate, verifyEmail);
router.post("/link_oauth", authenticate, linkOAuth);

export default router;