import { Router } from "express";
import { runCode } from "../controllers/runcode.controller";
import { submitCode } from "../controllers/submitcode.controller";

const router = Router();

router.post("/run", runCode);
router.post("/submit", submitCode);

export default router;