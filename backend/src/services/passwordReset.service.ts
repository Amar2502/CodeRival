import { redis } from "../config/redis";

export const verifyPasswordResetToken = async (email: string, token: string) => {

    const storedToken = await redis.get(`password-reset-token:${email}`);

    return storedToken === token;

};

