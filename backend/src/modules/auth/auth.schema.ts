import { z } from "zod";

export const RegisterSchema = z.object({
  name: z.string().trim().min(3).max(20),

  email: z.email().trim().toLowerCase(),

  username: z.string().trim().min(3).max(20),

  password: z.string().min(8).max(100),

  confirmPassword: z.string().min(8).max(100),
});

export const SigninSchema = z.object({
  id: z.string().trim().min(3).max(20),

  password: z.string().min(8).max(100),
});

export const RequestPasswordResetSchema = z.object({
  email: z.email().trim().toLowerCase(),
});

export const VerifyPasswordResetOTPSchema = z.object({
  email: z.email().trim().toLowerCase(),

  otp: z.string().length(6),
});

export const ResetPasswordSchema = z.object({
  email: z.email().trim().toLowerCase(),

  token: z.string().length(35),

  newPassword: z.string().min(8).max(100),
});