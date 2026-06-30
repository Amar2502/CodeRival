import dotenv from "dotenv";

dotenv.config();

export const config = {
    
    PORT : Number(process.env.PORT) || 5000,
    DATABASE_URL : process.env.DATABASE_URL || "",
    FRONTEND_URL : process.env.FRONTEND_URL || "http://localhost:3000",
    jwtSecret : process.env.JWT_SECRET || "defaultsecret"

}
