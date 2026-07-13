import { Router } from "express";
import { runCode } from "../controllers/runcode.controller";

const router = Router();

router.post("/run", runCode);

export default router;