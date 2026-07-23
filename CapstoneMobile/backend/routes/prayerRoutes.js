import express from "express";
import { getRequests, createRequest, prayForRequest } from "../controllers/prayerController.js";

const router = express.Router();

router.get("/prayers", getRequests);
router.post("/prayers", createRequest);
router.post("/prayers/:id/pray", prayForRequest);

export default router;
