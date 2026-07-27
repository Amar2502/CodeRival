import dotenv from "dotenv";

dotenv.config();

export const config = {
    
    PORT : Number(process.env.PORT) || 8000,
    DATABASE_URL : process.env.DATABASE_URL || "",
    FRONTEND_URL : process.env.FRONTEND_URL || "http://localhost:3000",
    BACKEND_URL : process.env.BACKEND_URL || "http://localhost:8000",
    jwtSecret : process.env.JWT_SECRET || "defaultsecret",

    PISTON_URL : process.env.PISTON_URL || "http://localhost:2000",
 
    RESEND_API_KEY : process.env.RESEND_API_KEY || "",
    GOOGLE_CLIENT_ID : process.env.GOOGLE_CLIENT_ID || "",
    GOOGLE_CLIENT_SECRET : process.env.GOOGLE_CLIENT_SECRET || "",
    GITHUB_CLIENT_ID : process.env.GITHUB_CLIENT_ID || "",
    GITHUB_CLIENT_SECRET : process.env.GITHUB_CLIENT_SECRET || "",

    IMAGEKIT_PUBLIC_KEY : process.env.IMAGEKIT_PUBLIC_KEY || "",
    IMAGEKIT_PRIVATE_KEY : process.env.IMAGEKIT_PRIVATE_KEY || "",
    IMAGEKIT_URL_ENDPOINT : process.env.IMAGEKIT_URL_ENDPOINT || "" 
}
