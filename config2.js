import dotenv from 'dotenv';
import Razorpay from 'razorpay';
dotenv.config();

export const cashfree = {
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  payoutEndpoint: `${process.env.CASHFREE_BASE_URL}/payout`,
  verificationEndpoint: `${process.env.CASHFREE_BASE_URL}/verification`,
  endpoint: `${process.env.CASHFREE_BASE_URL}`,
};

export const instance = new Razorpay({
  key_id: process.env.CF_CLIENT_ID, // Replace with environment variables for security
  key_secret: process.env.CF_CLIENT_SECRET
});
