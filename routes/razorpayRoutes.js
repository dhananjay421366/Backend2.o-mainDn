import express from 'express';
import { createOrder, processRefund, verifyPayment } from '../controllers/razorpayController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();
// router.use(authenticate); // Apply verifyJWT middleware to all routes in this file
// razorpay routes 
router.get('/', createOrder)
router.post('/pay-verify', verifyPayment);
router.post('/refund-payment', processRefund);

export default router;
