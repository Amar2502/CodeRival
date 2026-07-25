import { Router } from "express";
import { register, signin, requestPasswordReset, verifyPasswordResetOTP, resetPassword, getVerifyEmailOTP, checkVerifyEmailOTP } from "../auth/auth.controller"
import { validate } from "../../middleware/validate.middleware";
import { RegisterSchema, SigninSchema, RequestPasswordResetSchema, VerifyPasswordResetOTPSchema, ResetPasswordSchema } from "./auth.schema";
import {
  registerLimiter,
  signinLimiter,
  requestPasswordResetLimiter,
  verifyPasswordResetOTPLimiter,
  resetPasswordLimiter,
  getVerifyEmailOTPLimiter,
  checkVerifyEmailOTPLimiter,
} from "./auth.ratelimit";

const router = Router();

router.post("/register", registerLimiter, validate(RegisterSchema), register);
router.post("/signin", signinLimiter, validate(SigninSchema), signin);
router.post("/request-password-reset", requestPasswordResetLimiter, validate(RequestPasswordResetSchema), requestPasswordReset);
router.post("/verify-password-reset-otp", verifyPasswordResetOTPLimiter, validate(VerifyPasswordResetOTPSchema), verifyPasswordResetOTP);
router.post("/reset-password", resetPasswordLimiter, validate(ResetPasswordSchema), resetPassword);
router.post("/verify-email", getVerifyEmailOTPLimiter, validate(RequestPasswordResetSchema), getVerifyEmailOTP);
router.post("/check-verify-email-otp", checkVerifyEmailOTPLimiter, validate(VerifyPasswordResetOTPSchema), checkVerifyEmailOTP);

export default router;  