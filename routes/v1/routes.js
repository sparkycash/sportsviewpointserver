import express from "express";
import { DoSomething } from "../../controllers/v1/controllers.js"


const router = express.Router();

// Routes
router.get("/dosomething", DoSomething);

export default router;
