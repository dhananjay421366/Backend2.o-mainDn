import client from '../config.js';
import Razorpay from 'razorpay';
const instance = new Razorpay({
  key_id: process.env.CF_CLIENT_ID, // Replace with environment variables for security
  key_secret: process.env.CF_CLIENT_SECRET
});

export const processPayment = async (paymentData) => {
  const { amount, payment_method, booking_id } = paymentData;
  // For now, we'll simulate a successful payment with a random transaction ID
  const transaction_id = 'simulated-transaction-id';
  const result = await client.query(
    'INSERT INTO payments (booking_id, amount, payment_method, transaction_id) VALUES ($1, $2, $3, $4) RETURNING *',
    [booking_id, amount, payment_method, transaction_id]
  );

  return result.rows[0];
};


// razorpay 
export const checkPaymentStatusRazorpay = async (paymentId) => {
  try {
    const payment = await instance.payments.fetch(paymentId);

    // Check for success status
    if (payment.status === 'captured') {
      console.log('Success: Payment was captured successfully.');
    } else {
      console.log(`Payment Status: ${payment.status}`);
    }
    console.log(payment, "PaymentServices");
    return payment; // Return the payment details
  } catch (error) {
    console.error('Error fetching payment status:', error);
    throw error; // Re-throw error for handling in the caller
  }
};