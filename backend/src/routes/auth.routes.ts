import { Router } from "express";
import { register, signin, requestPasswordReset, verifyOTP, resetPassword } from "../controllers/auth.controller";

const router = Router();

router.post("/register", register);
router.post("/signin", signin);
router.post("/request-password-reset", requestPasswordReset);
router.post("/verify-otp", verifyOTP);
router.post("/reset-password", resetPassword);

export default router;