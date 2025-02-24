import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import organizerRoutes from './routes/organizers.js';
import eventRoutes from './routes/events.js';
import bookingRoutes from './routes/bookings.js';
import paymentRoutes from './routes/payments.js';
import ticketRoutes from './routes/tickets.js';
import notificationRoutes from './routes/notifications.js';
import userRoutes from './routes/user.js';
import beneficiaryRoutes from './routes/beneficiaryRoutes.js';
import bankAccountVerificationRoutes from './routes/bankAccountVerificationRoutes.js';
import transferRoutes from './routes/transferRoutes.js';
import razorpayRoutes from './routes/payments.js';
import expressLayouts from 'express-ejs-layouts';
import { webhookRouter } from './routes/webhook.route/webhook.route.js';
dotenv.config();
const app = express();
app.use(bodyParser.json());
app.use(express.json());
app.use(cookieParser());
app.use(cors());
app.use(expressLayouts);
app.set('view engine', 'ejs');


app.post('/selectPaymentGateway', (req, res) => {
  const { gateway } = req.body;

  if (!gateway) {
    return res.status(400).json({ message: "Payment gateway is required" });
  }

  // Dynamically include the routes based on the selected payment gateway
  if (gateway === 'cashfree') {
    // Use Cashfree Routes
    app.use('/cashfree', cashfreeRoutes); // Cashfree routes will be used for payments
    res.status(200).json({ message: "Cashfree gateway selected" });
  } else if (gateway === 'razorpay') {
    // Use Razorpay Routes
    app.use('/razorpay', razorpayRoutes); // Razorpay routes will be used for payments
    res.status(200).json({ message: "Razorpay gateway selected" });
  } else {
    res.status(400).json({ message: "Invalid payment gateway" });
  }
});
export default app;


app.use('/users', userRoutes);
app.use('/organizers', organizerRoutes);
app.use('/events', eventRoutes);
app.use('/bookings', bookingRoutes);
app.use('/payments', paymentRoutes);
app.use('/tickets', ticketRoutes);
app.use('/notifications', notificationRoutes);
app.use("/api/beneficiaries", beneficiaryRoutes);
app.use("/api/verification", bankAccountVerificationRoutes);
app.use("/api/transfer", transferRoutes);
app.use('/api/webhook', webhookRouter);

// razorpay 
app.use('/checkout', razorpayRoutes);
// phone Pay 
app.use('/phone-pay', razorpayRoutes)

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
