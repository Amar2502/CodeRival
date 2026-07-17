import { redis } from "../config/redis";
import { generateOTPKey, generateOTP } from "../utils/generateOTP";
import { generateOTPToken } from "../utils/generateToken";

export const saveOTP = async (email: string, task: "forgot-password" | "verify-email") => {

    const otpkey = generateOTPKey(email, task);
    const otp = generateOTP();

    await redis.set(otpkey, otp, "EX", 600); // 10 minutes

    return otp;

};

export const verifyOTP = async (email: string, otp: string, task: "forgot-password" | "verify-email") => {

    const otpkey = generateOTPKey(email, task);
    const storedOTP = await redis.get(otpkey);

    if (!storedOTP) {
        return "OTP expired or not found";
    }

    if (storedOTP !== otp) {
        return "Invalid OTP";
    }

    await redis.del(otpkey);

    const token = generateOTPToken();

    if(task === "forgot-password") {
        await redis.set(`${task}-token:${email}`, token, "EX", 600); // 10 minutes
        return token;
    }
    
    return true;

};

export const otpService = {
    saveOTP,
    verifyOTP
};