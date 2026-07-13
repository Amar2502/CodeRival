export const generateOTPKey = (email: string): string => {
  return `otp:forgot-password:${email}`;
}

export const generateOTP = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
}