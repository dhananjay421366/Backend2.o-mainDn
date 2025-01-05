import express from 'express';
import { checkPaymentStatus, createOrder, createOrderCashfree, dtailedoforder, initiaterefund, paybycard, paybynetwork, paybyupi, paybyupiqr, paybywallet, PaymentStatus, PhonePay, refundinformation, verifyPayment } from '../controllers/paynowcontroller.js';


const router = express.Router();

// CashFree routes 
router.post('/createOrder', createOrderCashfree);
router.post('/paybycard', paybycard)
router.post('/paybyupi', paybyupi)
router.get('/paybyupiqr', paybyupiqr)
router.get('/paybynetwork', paybynetwork)
router.get('/dtailedoforder', dtailedoforder)
router.get('/initiaterefund', initiaterefund)
router.get('/refundinformation', refundinformation)
router.get('/paybywallet', paybywallet)
router.get('/verifyPayment', checkPaymentStatus)



export default router;
