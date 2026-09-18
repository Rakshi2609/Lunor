import express from 'express';
import { sendOtp, verifyOtp, login, getCurrentUser } from '../controllers/auth.controller.js';
import { verifyToken } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/send-otp', authLimiter, sendOtp);
router.post('/verify-otp', authLimiter, verifyOtp);
router.post('/login', authLimiter, login);
router.get('/me', verifyToken, getCurrentUser);

export default router;

