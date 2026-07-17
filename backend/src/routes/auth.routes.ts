import { Router } from "express";
import { register, signin, requestPasswordReset, verifyPasswordResetOTP, resetPassword, getVerifyEmailOTP, checkVerifyEmailOTP } from "../controllers/auth.controller";

const router = Router();

router.post("/register", register);
router.post("/signin", signin);
router.post("/request-password-reset", requestPasswordReset);
router.post("/verify-password-reset-otp", verifyPasswordResetOTP);
router.post("/reset-password", resetPassword);
router.post("/verify-email", getVerifyEmailOTP);
router.post("/check-verify-email-otp", checkVerifyEmailOTP);

export default router;  