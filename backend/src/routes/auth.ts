import { Router } from "express";
import { register, signin } from "../controllers/auth";

const router = Router();

router.post("/register", register);
router.post("/signin", signin);

export default router;