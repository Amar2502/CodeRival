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
  sendContactForm,
} from "../user/user.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";
import { checkUsernameSchema, updateUserProfileSchema } from "./user.schema";
import { BadRequestError } from "../../utils/errors";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB maximum limit
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new BadRequestError("Only image files are permitted (JPEG, PNG, WebP, etc.)"));
    }
  },
});

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
router.post("/contact", sendContactForm);

export default router;