import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authRoutes } from "./modules/auth";
import { userRoutes } from "./modules/user";
import { problemRoutes } from "./modules/problem";
import { config } from "./config/config";

const app = express();

app.use(express.json());
app.use(cors(
    {
        origin: [
            config.FRONTEND_URL
        ],
        credentials: true,
    }
));
app.use(cookieParser());
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/problem", problemRoutes);

export default app;