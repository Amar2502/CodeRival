import { Router } from "express";
import { checkUsername } from "../controllers/user";

const router = Router();

router.get("/check-username", checkUsername);

export default router;