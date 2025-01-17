import express from 'express';
import { createOrder, verifyPayment } from '../controllers/razorpayController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();
// router.use(authenticate); // Apply verifyJWT middleware to all routes in this file
// razorpay routes 
router.get('/', createOrder)
router.post('/pay-verify', verifyPayment);

export default router;
