import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import problemRoutes from "./routes/problems.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import codeRoutes from "./routes/code.routes";    
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
app.use("/code", codeRoutes);

export default app;