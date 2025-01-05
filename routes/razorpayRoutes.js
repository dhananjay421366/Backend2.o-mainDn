import express from 'express';
import { createOrder, verifyPayment } from '../controllers/paynowcontroller.js';

const router = express.Router();
// router.use(authenticate); // Apply verifyJWT middleware to all routes in this file
// razorpay routes 
router.post('/createOrder', createOrder)
router.post('/pay-verify', verifyPayment);

export default router;
