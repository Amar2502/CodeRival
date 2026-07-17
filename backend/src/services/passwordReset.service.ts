import { redis } from "../config/redis";

export const verifyToken = async (email: string, token: string, task: "forgot-password" | "verify-email") => {

    const storedToken = await redis.get(`${task}-token:${email}`);

    return storedToken === token;

};

