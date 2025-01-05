import dotenv from 'dotenv';
dotenv.config();

export const cashfree = {
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  payoutEndpoint: `${process.env.CASHFREE_BASE_URL}/payout`,
  verificationEndpoint: `${process.env.CASHFREE_BASE_URL}/verification`,
  endpoint: `${process.env.CASHFREE_BASE_URL}`,
};
