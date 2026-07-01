import { Router } from "express";
import { getDashboard } from "../controllers/dashboard";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.get("/get", authenticate, getDashboard);

export default router;