export const generateOTPKey = (email: string, task: "forgot-password" | "verify-email"): string => {
  return `otp:${task}:${email}`;
}

export const generateOTP = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
}