import { redis } from "../config/redis";
import { generateOTP, generateOTPKey } from "../utils/generateOTP";
import { generatePasswordResetToken } from "../utils/generateToken";

export const saveOTP = async (email: string) => {

    const otpkey = generateOTPKey(email);
    const otp = generateOTP();

    await redis.set(otpkey, otp, "EX", 600); // 10 minutes

    return otp;

};

export const verifyOTP = async (email: string, otp: string) => {

    const otpkey = generateOTPKey(email);
    const storedOTP = await redis.get(otpkey);

    if (!storedOTP) {
        return "OTP expired or not found";
    }

    if (storedOTP !== otp) {
        return "Invalid OTP";
    }

    await redis.del(otpkey);

    const token = generatePasswordResetToken();

    await redis.set(`password-reset-token:${email}`, token, "EX", 600); // 10 minutes

    return token;

};

export const otpService = {
    saveOTP,
    verifyOTP
};