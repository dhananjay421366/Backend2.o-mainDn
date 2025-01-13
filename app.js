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

// Razorpay route is commented out, you can enable it if needed
app.use('/checkout', razorpayRoutes);

// Dynamic payment gateway routes
const dynamicRoutes = {};

// Set up routes based on the selected gateway and mode
const setupPaymentGatewayRoutes = () => {
  // Remove existing dynamic routes
  Object.values(dynamicRoutes).forEach((route) => {
    app._router.stack = app._router.stack.filter(layer => layer !== route);
  });

  // Add the selected gateway's routes based on the mode
  switch (selectedGateway) {
    case 'cashfree':
      dynamicRoutes.cashfree = app.use(`/cashfree/${gatewayMode}`, cashfreeRoutes);
      break;
    case 'razorpay':
      dynamicRoutes.razorpay = app.use('/checkout', razorpayRoutes);
      break;
    case 'phonepay':
      dynamicRoutes.phonepay = app.use(`/phone-pay/${gatewayMode}`, PhonePayRoutes);
      break;
    default:
      break;
  }
};

// Initially set up the default gateway and mode
setupPaymentGatewayRoutes();

// Toggle payment gateway
const togglePaymentGateway = (req, res) => {
  const gateways = ['cashfree', 'razorpay', 'phonepay'];
  const currentIndex = gateways.indexOf(selectedGateway);
  selectedGateway = gateways[(currentIndex + 1) % gateways.length];

  // Reconfigure the routes based on the new selection
  setupPaymentGatewayRoutes();

  return res.status(200).json({ message: `Payment gateway switched to ${selectedGateway}` });
};

// Toggle gateway mode
const toggleGatewayMode = (req, res) => {
  // Toggle the mode
  gatewayMode = gatewayMode === 'test' ? 'live' : 'test';

  // Reconfigure the routes based on the new mode
  setupPaymentGatewayRoutes();

  return res.status(200).json({ message: `Payment gateway mode switched to ${gatewayMode}` });
};

// Register the toggle routes
app.post('/api/togglePaymentGateway', togglePaymentGateway);
app.post('/api/toggleGatewayMode', toggleGatewayMode);

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
