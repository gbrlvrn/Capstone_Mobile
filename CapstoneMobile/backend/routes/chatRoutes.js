import express from 'express';
import { chatWithBot } from '../controllers/chatController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/chat', authMiddleware, chatWithBot);

export default router;
