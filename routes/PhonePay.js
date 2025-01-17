import express from 'express';
import { PaymentStatus, PhonePay } from '../controllers/phonepayController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticate); // Apply verifyJWT middleware to all routes in this file

//  phone pay routes 
router.get("/pay", PhonePay)
router.get("/payment/validate/:merchantTransactionId", PaymentStatus)



export default router;
