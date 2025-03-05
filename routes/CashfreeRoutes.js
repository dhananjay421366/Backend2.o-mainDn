import express from 'express';
import { checkPaymentStatus, createOrderCashfree, dtailedoforder, initiaterefund, paybycard, paybynetwork, paybyupi, paybyupiqr, paybywallet, refundinformation } from '../controllers/cashfreeController.js';


const router = express.Router();
// router.use(authenticate); // Apply verifyJWT middleware to all routes in this file

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


// payment status 
// Route to check payment status
router.get("/check-payment-status", checkPaymentStatus);




export default router;
