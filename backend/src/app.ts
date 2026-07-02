import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/user";
import problemRoutes from "./routes/problem";
import dashboardRoutes from "./routes/dashboard";
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
app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/problem", problemRoutes); 

export default app;