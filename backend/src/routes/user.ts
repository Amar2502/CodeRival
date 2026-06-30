import { Router } from "express";
import { checkUsername, getMe } from "../controllers/user";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.get("/check-username", checkUsername);
router.get("/me", authenticate, getMe);

export default router;