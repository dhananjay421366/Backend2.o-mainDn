// import express from 'express';
// import bodyParser from 'body-parser';
// import cookieParser from 'cookie-parser';
// import cors from 'cors';
// import dotenv from 'dotenv';
// import expressLayouts from 'express-ejs-layouts';

// import organizerRoutes from './routes/organizers.js';
// import eventRoutes from './routes/events.js';
// import bookingRoutes from './routes/bookings.js';
// import PhonePayRoutes from './routes/PhonePay.js';
// import ticketRoutes from './routes/tickets.js';
// import notificationRoutes from './routes/notifications.js';
// import userRoutes from './routes/user.js';
// import beneficiaryRoutes from './routes/beneficiaryRoutes.js';
// import bankAccountVerificationRoutes from './routes/bankAccountVerificationRoutes.js';
// import transferRoutes from './routes/transferRoutes.js';
// // import razorpayRoutes from './routes/payments.js';
// import cashfreeRoutes from './routes/CashfreeRoutes.js'; // Assuming you have Cashfree routes
// import razorpayRoutes from './routes/razorpayRoutes.js'; // Assuming you have Cashfree routes

// dotenv.config();

// const app = express();

// // Middleware
// app.use(bodyParser.json());
// app.use(express.json());
// app.use(cookieParser());
// app.use(cors());
// app.use(expressLayouts);
// app.set('view engine', 'ejs');

// // Define routes
// app.use('/users', userRoutes);
// app.use('/organizers', organizerRoutes);
// app.use('/events', eventRoutes);
// app.use('/bookings', bookingRoutes);
// app.use('/tickets', ticketRoutes);
// app.use('/notifications', notificationRoutes);
// app.use('/api/beneficiaries', beneficiaryRoutes);
// app.use('/api/verification', bankAccountVerificationRoutes);
// app.use('/api/transfer', transferRoutes);
// app.use('/phone-pay', PhonePayRoutes);

// // Dynamic payment gateway selection
// const selectPaymentGateway = (req, res) => {
//   const { gateway } = req.body;

//   if (!gateway) {
//     return res.status(400).json({ message: "Payment gateway is required" });
//   }

//   // Dynamically route based on the selected gateway
//   if (gateway === 'cashfree') {
//     app.use('/cashfree', cashfreeRoutes);
//     return res.status(200).json({ message: "Cashfree gateway selected" });
//   } else if (gateway === 'razorpay') {
//     app.use('/razorpay', razorpayRoutes);
//     return res.status(200).json({ message: "Razorpay gateway selected" });
//   } else {
//     return res.status(400).json({ message: "Invalid payment gateway" });
//   }
// };

// // Register the selectPaymentGateway route
// app.post('/api/selectPaymentGateway', selectPaymentGateway);

// // Start the server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
// });
// import express from 'express';
// import bodyParser from 'body-parser';
// import cookieParser from 'cookie-parser';
// import cors from 'cors';
// import dotenv from 'dotenv';
// import expressLayouts from 'express-ejs-layouts';

// import organizerRoutes from './routes/organizers.js';
// import eventRoutes from './routes/events.js';
// import bookingRoutes from './routes/bookings.js';
// import PhonePayRoutes from './routes/PhonePay.js';
// import ticketRoutes from './routes/tickets.js';
// import notificationRoutes from './routes/notifications.js';
// import userRoutes from './routes/user.js';
// import beneficiaryRoutes from './routes/beneficiaryRoutes.js';
// import bankAccountVerificationRoutes from './routes/bankAccountVerificationRoutes.js';
// import transferRoutes from './routes/transferRoutes.js';
// import cashfreeRoutes from './routes/CashfreeRoutes.js';
// import razorpayRoutes from './routes/razorpayRoutes.js';

// dotenv.config();

// const app = express();

// // Global variable to store the selected payment gateway
// let selectedGateway = 'cashfree'; // Default to Cashfree

// // Middleware
// app.use(bodyParser.json());
// app.use(express.json());
// app.use(cookieParser());
// app.use(cors());
// app.use(expressLayouts);
// app.set('view engine', 'ejs');

// // Define routes
// app.use('/users', userRoutes);
// app.use('/organizers', organizerRoutes);
// app.use('/events', eventRoutes);
// app.use('/bookings', bookingRoutes);
// app.use('/tickets', ticketRoutes);
// app.use('/notifications', notificationRoutes);
// app.use('/api/beneficiaries', beneficiaryRoutes);
// app.use('/api/verification', bankAccountVerificationRoutes);
// app.use('/api/transfer', transferRoutes);
// app.use('/phone-pay', PhonePayRoutes);

// // Set up routes based on the selected gateway
// const setupPaymentGatewayRoutes = () => {
//   if (selectedGateway === 'cashfree') {
//     app.use('/cashfree', cashfreeRoutes);
//     // Remove Razorpay route if Cashfree is selected
//     app._router.stack = app._router.stack.filter(layer => layer.name !== 'razorpay');
//   } else if (selectedGateway === 'razorpay') {
//     app.use('/razorpay', razorpayRoutes);
//     // Remove Cashfree route if Razorpay is selected
//     app._router.stack = app._router.stack.filter(layer => layer.name !== 'cashfree');
//   }
// };

// // Initially set up the default gateway (Cashfree)
// setupPaymentGatewayRoutes();

// // Dynamic payment gateway selection
// const selectPaymentGateway = (req, res) => {
//   const { gateway } = req.body;

//   if (!gateway) {
//     return res.status(400).json({ message: "Payment gateway is required" });
//   }

//   if (gateway === 'cashfree' || gateway === 'razorpay') {
//     selectedGateway = gateway;  // Update the global variable
//     setupPaymentGatewayRoutes();  // Reconfigure routes based on the selected gateway
//     return res.status(200).json({ message: `${gateway} gateway selected` });
//   } else {
//     return res.status(400).json({ message: "Invalid payment gateway" });
//   }
// };

// // Register the selectPaymentGateway route
// app.post('/api/selectPaymentGateway', selectPaymentGateway);

// // Start the server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
// });
// import express from 'express';
// import bodyParser from 'body-parser';
// import cookieParser from 'cookie-parser';
// import cors from 'cors';
// import dotenv from 'dotenv';
// import expressLayouts from 'express-ejs-layouts';

// import organizerRoutes from './routes/organizers.js';
// import eventRoutes from './routes/events.js';
// import bookingRoutes from './routes/bookings.js';
// import PhonePayRoutes from './routes/PhonePay.js';
// import ticketRoutes from './routes/tickets.js';
// import notificationRoutes from './routes/notifications.js';
// import userRoutes from './routes/user.js';
// import beneficiaryRoutes from './routes/beneficiaryRoutes.js';
// import bankAccountVerificationRoutes from './routes/bankAccountVerificationRoutes.js';
// import transferRoutes from './routes/transferRoutes.js';
// import cashfreeRoutes from './routes/CashfreeRoutes.js';
// import razorpayRoutes from './routes/razorpayRoutes.js';

// dotenv.config();

// const app = express();

// // Global variable to store the selected payment gateway
// let selectedGateway = 'cashfree'; // Default to Cashfree

// // Middleware
// app.use(bodyParser.json());
// app.use(express.json());
// app.use(cookieParser());
// app.use(cors());
// app.use(expressLayouts);
// app.set('view engine', 'ejs');

// // Define routes
// app.use('/users', userRoutes);
// app.use('/organizers', organizerRoutes);
// app.use('/events', eventRoutes);
// app.use('/bookings', bookingRoutes);
// app.use('/tickets', ticketRoutes);
// app.use('/notifications', notificationRoutes);
// app.use('/api/beneficiaries', beneficiaryRoutes);
// app.use('/api/verification', bankAccountVerificationRoutes);
// app.use('/api/transfer', transferRoutes);
// app.use('/phone-pay', PhonePayRoutes);

// // Set up routes based on the selected gateway
// const setupPaymentGatewayRoutes = () => {
//   // Clear the routes (except the default ones)
//   app._router.stack = app._router.stack.filter(layer => layer.name !== 'router');

//   if (selectedGateway === 'cashfree') {
//     app.use('/cashfree', cashfreeRoutes);
//   } else if (selectedGateway === 'razorpay') {
//     app.use('/razorpay', razorpayRoutes);
//   }
// };

// // Initially set up the default gateway (Cashfree)
// setupPaymentGatewayRoutes();

// // Toggle payment gateway
// const togglePaymentGateway = (req, res) => {
//   // Toggle the selected gateway
//   selectedGateway = selectedGateway === 'cashfree' ? 'razorpay' : 'cashfree';

//   // Reconfigure the routes based on the new selection
//   setupPaymentGatewayRoutes();

//   return res.status(200).json({ message: `Payment gateway switched to ${selectedGateway}` });
// };

// // Register the togglePaymentGateway route
// app.post('/api/togglePaymentGateway', togglePaymentGateway);

// // Start the server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
// });
import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import expressLayouts from 'express-ejs-layouts';

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
// razorpay 
// app.use('/checkout', razorpayRoutes);

// Dynamic payment gateway routes
const dynamicRoutes = {};


// Set up routes based on the selected gateway and mode
const setupPaymentGatewayRoutes = () => {
  // Remove existing dynamic routes
  Object.keys(dynamicRoutes).forEach((routeKey) => {
    app._router.stack = app._router.stack.filter(
      (layer) => layer !== dynamicRoutes[routeKey]
    );
  });

  // Add the selected gateway's routes based on the mode
  if (selectedGateway === 'cashfree') {
    dynamicRoutes.cashfree = app.use(
      `/cashfree/${gatewayMode}`,
      cashfreeRoutes
    );
  } else if (selectedGateway === 'razorpay') {
    dynamicRoutes.razorpay = app.use('/checkout', razorpayRoutes);
  } else if (selectedGateway === 'phonepay') {
    dynamicRoutes.phonepay = app.use(
      `/phone-pay/${gatewayMode}`,
      PhonePayRoutes
    );
  }
};

// Initially set up the default gateway and mode
setupPaymentGatewayRoutes();

// Toggle payment gateway
const togglePaymentGateway = (req, res) => {

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

  return res
    .status(200)
    .json({ message: `Payment gateway switched to ${selectedGateway}` });
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
