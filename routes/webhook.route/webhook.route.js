import router from 'express';

import {checkWebhook} from '../../controllers/webhook.controller/payment.webhook.controller.js';

const webhookRouter = router();

webhookRouter.post('/webhook-test', checkWebhook);

export {
  webhookRouter
}