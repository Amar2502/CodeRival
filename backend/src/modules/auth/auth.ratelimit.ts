import { createRateLimiter, getIpKey, getEmailOrIpKey } from "../../lib/rate-limit";

// Rate limiters for auth endpoints

// 1. Signin: 10 attempts per 15 minutes per email/IP
export const signinLimiter = createRateLimiter({
  window: 15 * 60, // 15 minutes
  limit: 10,
  type: "auth:signin",
  keyGenerator: getEmailOrIpKey,
  message: "Too many signin attempts. Please try again after 15 minutes.",
});

// 2. Register: 5 registrations per 15 minutes per IP
export const registerLimiter = createRateLimiter({
  window: 15 * 60, // 15 minutes
  limit: 5,
  type: "auth:register",
  keyGenerator: getIpKey,
  message: "Too many account registration attempts from this IP. Please try again after 15 minutes.",
});

// 3. Request Password Reset: 3 requests per 15 minutes per email/IP
export const requestPasswordResetLimiter = createRateLimiter({
  window: 15 * 60, // 15 minutes
  limit: 3,
  type: "auth:request-password-reset",
  keyGenerator: getEmailOrIpKey,
  message: "Too many password reset requests. Please check your email or try again in 15 minutes.",
});

// 4. Verify Password Reset OTP: 5 attempts per 15 minutes per email/IP
export const verifyPasswordResetOTPLimiter = createRateLimiter({
  window: 15 * 60, // 15 minutes
  limit: 5,
  type: "auth:verify-password-reset-otp",
  keyGenerator: getEmailOrIpKey,
  message: "Too many OTP verification attempts. Please try again after 15 minutes.",
});

// 5. Reset Password: 5 requests per 15 minutes per email/IP
export const resetPasswordLimiter = createRateLimiter({
  window: 15 * 60, // 15 minutes
  limit: 5,
  type: "auth:reset-password",
  keyGenerator: getEmailOrIpKey,
  message: "Too many password reset attempts. Please try again after 15 minutes.",
});

// 6. Verify Email OTP request: 3 requests per 15 minutes per email/IP
export const getVerifyEmailOTPLimiter = createRateLimiter({
  window: 15 * 60, // 15 minutes
  limit: 3,
  type: "auth:get-verify-email-otp",
  keyGenerator: getEmailOrIpKey,
  message: "Too many email verification OTP requests. Please try again after 15 minutes.",
});

// 7. Check Verify Email OTP: 5 attempts per 15 minutes per email/IP
export const checkVerifyEmailOTPLimiter = createRateLimiter({
  window: 15 * 60, // 15 minutes
  limit: 5,
  type: "auth:check-verify-email-otp",
  keyGenerator: getEmailOrIpKey,
  message: "Too many verification attempts. Please try again after 15 minutes.",
});
