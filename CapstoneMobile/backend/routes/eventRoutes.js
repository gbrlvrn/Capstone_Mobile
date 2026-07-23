import express from "express";
import { getEvents, rsvpEvent, seedEvents } from "../controllers/eventController.js";

const router = express.Router();

router.get("/events", getEvents);
router.post("/events/:id/rsvp", rsvpEvent);
router.post("/events/seed", seedEvents);

export default router;
