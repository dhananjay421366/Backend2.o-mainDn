import express from 'express';
import { checkPaymentStatus, createOrder, createOrderCashfree, dtailedoforder, initiaterefund, paybycard, paybynetwork, paybyupi, paybyupiqr, paybywallet, PaymentStatus, PhonePay, refundinformation, verifyPayment } from '../controllers/paynowcontroller.js';
import { authenticate } from '../middlewares/authMiddleware.js';


const router = express.Router();
router.use(authenticate); // Apply verifyJWT middleware to all routes in this file

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
