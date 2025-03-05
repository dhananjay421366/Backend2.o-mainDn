import router from 'express';
import { handleCashfreeNotify } from '../controllers/cashfreeController.js';
const webhookRouter = router();

// webhookRouter.post('/webhook-test', checkWebhook);

// Route for Cashfree webhook (notify URL)
webhookRouter.post("/notify", handleCashfreeNotify);

export {
  webhookRouter
}