import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import expressLayouts from 'express-ejs-layouts';

// Import routes
import organizerRoutes from './routes/organizers.js';
import eventRoutes from './routes/events.js';
import bookingRoutes from './routes/bookings.js';
import PhonePayRoutes from './routes/PhonePay.js'; // Import PhonePay routes
import ticketRoutes from './routes/tickets.js';
import notificationRoutes from './routes/notifications.js';
import userRoutes from './routes/user.js';
import beneficiaryRoutes from './routes/beneficiaryRoutes.js';
import bankAccountVerificationRoutes from './routes/bankAccountVerificationRoutes.js';
import transferRoutes from './routes/transferRoutes.js';
import cashfreeRoutes from './routes/CashfreeRoutes.js';
import razorpayRoutes from './routes/razorpayRoutes.js';
import { webhookRouter } from './routes/webhookRoutes.js';


dotenv.config();

const app = express();

// Global variables to store the selected payment gateway and mode
export let selectedGateway = 'cashfree'; // Default to Cashfree
let gatewayMode = 'test'; // Default to test mode (can be 'live' or 'test')

// Middleware
app.use(bodyParser.json());
app.use(express.json());
app.use(cookieParser());
app.use(cors());
app.use(expressLayouts);
app.set('view engine', 'ejs');

// Define static routes
app.use('/users', userRoutes);
app.use('/organizers', organizerRoutes);
app.use('/events', eventRoutes);
app.use('/bookings', bookingRoutes);
app.use('/tickets', ticketRoutes);
app.use('/notifications', notificationRoutes);
app.use('/api/beneficiaries', beneficiaryRoutes);
app.use('/api/verification', bankAccountVerificationRoutes);
app.use('/api/transfer', transferRoutes);
app.use('/api/webhook', webhookRouter);


// Webhook endpoint
app.post("/cashfree/test/notify", (req, res) => {
  console.log("Webhook received:", req.body); // Log the webhook data

  // Validate the request from Cashfree (Optional but recommended)
  if (!req.body || !req.body.orderId) {
    return res.status(400).json({ success: false, message: "Invalid payload" });
  }

  // Process the payment status
  const { orderId, txStatus, paymentMode, referenceId, txMsg, txTime } = req.body;

  // You should update the payment status in your database here
  console.log(`Payment Update: Order ${orderId}, Status: ${txStatus}`);

  // Send response back to Cashfree (Very Important)
  res.status(200).json({ success: true, message: "Webhook received successfully" });
});

const dynamicRoutes = {};

const restrictToSelectedGateway = (gateway) => (req, res, next) => {
  if (selectedGateway !== gateway) {
    return res
      .status(403)
      .json({ error: `Access denied. Current gateway is ${selectedGateway} ` });
  }
  next();
};

// Set up routes based on the selected gateway and mode
const setupPaymentGatewayRoutes = () => {
  // Remove existing dynamic routes
  Object.values(dynamicRoutes).forEach((route) => {
    app._router.stack = app._router.stack.filter(layer => layer !== route);
  });

  // Add the selected gateway's routes based on the mode
  if (selectedGateway === 'cashfree') {
    dynamicRoutes.cashfree = app.use(
      `/cashfree/${gatewayMode}`,
      restrictToSelectedGateway('cashfree'),
      cashfreeRoutes
    );
  } else if (selectedGateway === 'razorpay') {
    dynamicRoutes.razorpay = app.use(
      '/checkout',
      restrictToSelectedGateway('razorpay'),
      razorpayRoutes
    );
  } else if (selectedGateway === 'phonepay') {
    dynamicRoutes.phonepay = app.use(
      `/phone-pay/${gatewayMode}`,
      restrictToSelectedGateway('phonepay'),
      PhonePayRoutes
    );
  }
};

// Initially set up the default gateway and mode
setupPaymentGatewayRoutes();

// Toggle payment gateway
const togglePaymentGateway = (req, res) => {
  const { gateway } = req.body;
  // Toggle the selected gateway
  if (selectedGateway === 'cashfree') {
    selectedGateway = 'razorpay';
  } else if (selectedGateway === 'razorpay') {
    selectedGateway = 'phonepay';
  } else if (selectedGateway === 'phonepay') {
    selectedGateway = 'cashfree';
  }

  // Reconfigure the routes based on the new selection
  setupPaymentGatewayRoutes();

  return res.status(200).json({ message: `Payment gateway switched to ${selectedGateway} ` });
};

// Toggle gateway mode
const toggleGatewayMode = (req, res) => {
  // Toggle the mode
  gatewayMode = gatewayMode === 'test' ? 'live' : 'test';

  // Reconfigure the routes based on the new mode
  setupPaymentGatewayRoutes();


  return res
    .status(200)
    .json({ message: `Payment gateway mode switched to ${gatewayMode}` });
};

// Register the toggle routes
app.post('/api/togglePaymentGateway', togglePaymentGateway);
app.post('/api/toggleGatewayMode', toggleGatewayMode);

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
