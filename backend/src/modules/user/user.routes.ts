import { Router } from "express";
import multer from "multer";
import {
  checkUsername,
  getMe,
  getUserProfile,
  updateUserProfile,
  verifyEmail,
  linkOAuth,
  uploadAvatarController,
  removeAvatarController,
  changePassword,
  deleteAccountController,
} from "../user/user.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";
import { checkUsernameSchema, updateUserProfileSchema } from "./user.schema";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

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
router.post("/upload_avatar", authenticate, upload.single("avatar"), uploadAvatarController);
router.delete("/remove_avatar", authenticate, removeAvatarController);
router.post("/change_password", authenticate, changePassword);
router.delete("/delete_account", authenticate, deleteAccountController);

export default router;