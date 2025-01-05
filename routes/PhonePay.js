import express from 'express';
import { PaymentStatus, PhonePay } from '../controllers/paynowcontroller.js';

const router = express.Router();


//  phone pay routes 
router.get("/pay", PhonePay)
router.get("/payment/validate/:merchantTransactionId", PaymentStatus)



export default router;
