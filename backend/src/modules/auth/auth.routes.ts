import { Router } from "express";
import { register, signin, logout, requestPasswordReset, verifyPasswordResetOTP, resetPassword, getVerifyEmailOTP, checkVerifyEmailOTP, handleOAuthSuccess } from "../auth/auth.controller"
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
import passport from "../../config/passport";
import { config } from "../../config/config";

const router = Router();

router.post("/register", registerLimiter, validate(RegisterSchema), register);
router.post("/signin", signinLimiter, validate(SigninSchema), signin);
router.post("/logout", logout);
router.post("/request-password-reset", requestPasswordResetLimiter, validate(RequestPasswordResetSchema), requestPasswordReset);
router.post("/verify-password-reset-otp", verifyPasswordResetOTPLimiter, validate(VerifyPasswordResetOTPSchema), verifyPasswordResetOTP);
router.post("/reset-password", resetPasswordLimiter, validate(ResetPasswordSchema), resetPassword);
router.post("/verify-email", getVerifyEmailOTPLimiter, validate(RequestPasswordResetSchema), getVerifyEmailOTP);
router.post("/check-verify-email-otp", checkVerifyEmailOTPLimiter, validate(VerifyPasswordResetOTPSchema), checkVerifyEmailOTP);

// Google OAuth
router.get(
  "/google",
  (req, res, next) => {
    const redirect = (req.query.redirect as string) || "/profile";
    const state = JSON.stringify({ redirect });
    passport.authenticate("google", { scope: ["profile", "email"], session: false, state })(req, res, next);
  }
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: `${config.FRONTEND_URL}/signin?error=GoogleOAuthFailed` }),
  handleOAuthSuccess
);

// GitHub OAuth
router.get(
  "/github",
  (req, res, next) => {
    const redirect = (req.query.redirect as string) || "/profile";
    const state = JSON.stringify({ redirect });
    passport.authenticate("github", { scope: ["user:email"], session: false, state })(req, res, next);
  }
);

router.get(
  "/github/callback",
  passport.authenticate("github", { session: false, failureRedirect: `${config.FRONTEND_URL}/signin?error=GitHubOAuthFailed` }),
  handleOAuthSuccess
);

export default router;  