import { Router } from "express";
import { getProblem } from "../controllers/problems";

const router = Router();

router.get("/get/:slug", getProblem);

export default router;