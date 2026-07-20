import { Router } from "express";
import { register, signin, requestPasswordReset, verifyPasswordResetOTP, resetPassword, getVerifyEmailOTP, checkVerifyEmailOTP } from "../auth/auth.controller"
import { validate } from "../../middleware/validate.middleware";
import { RegisterSchema, SigninSchema, RequestPasswordResetSchema, VerifyPasswordResetOTPSchema, ResetPasswordSchema } from "./auth.schema";

const router = Router();

router.post("/register", validate(RegisterSchema), register);
router.post("/signin", validate(SigninSchema), signin);
router.post("/request-password-reset", validate(RequestPasswordResetSchema), requestPasswordReset);
router.post("/verify-password-reset-otp", validate(VerifyPasswordResetOTPSchema), verifyPasswordResetOTP);
router.post("/reset-password", validate(ResetPasswordSchema), resetPassword);
router.post("/verify-email", validate(RequestPasswordResetSchema), getVerifyEmailOTP);
router.post("/check-verify-email-otp", validate(VerifyPasswordResetOTPSchema), checkVerifyEmailOTP);

export default router;  