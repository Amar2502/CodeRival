import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "./config/passport";
import { authRoutes } from "./modules/auth";
import { userRoutes } from "./modules/user";
import { problemRoutes } from "./modules/problem";
import { matchRoutes } from "./modules/match";
import friendsRoutes from "./modules/friends/friends.routes";
import { config } from "./config/config";
import { errorHandler } from "./middleware/error.middleware";

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: [config.FRONTEND_URL],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(passport.initialize());
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/problem", problemRoutes);
app.use("/api/match", matchRoutes);
app.use("/api/friends", friendsRoutes);

app.use(errorHandler);

export default app;