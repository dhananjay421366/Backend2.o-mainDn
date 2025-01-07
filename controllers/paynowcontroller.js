import { CFApp, CFAppPayment, CFCard, CFCardPayment, CFConfig, CFCustomerDetails, CFEnvironment, CFNetbanking, CFOrderPayRequest, CFOrderRequest, CFPaymentGateway, CFPaymentMethod, CFRefundRequest, CFUPI, CFUPIPayment } from "cashfree-pg-sdk-nodejs";
import crypto from 'crypto';
import dotenv from 'dotenv';
import Razorpay from 'razorpay';
import { v4 as uuidv4 } from 'uuid'; // Import UUID library for generating unique IDs
import client from '../config.js';
import uniqid from 'uniqid'; // ES6 import
import { checkPaymentStatusRazorpay } from "../services/paymentService.js";
import { selectedGateway } from "../app.js";
dotenv.config();
// Initialize Cashfree configuration with the environment and credentials
const cfConfig = new CFConfig(
  CFEnvironment.SANDBOX, // Environment, change to PRODUCTION for live environment
  "2023-08-01", // API Version
  process.env.CLIENT_ID, // Client ID from environment variable
  process.env.CLIENT_SECRET // Client Secret from environment variable
);

const instance = new Razorpay({
  key_id: process.env.CF_CLIENT_ID, // Replace with environment variables for security
  key_secret: process.env.CF_CLIENT_SECRET
});
// Controller functions

// Create an order
export const createOrderCashfree = async (req, res) => {
  try {
    const { booking_id, phone_number, email, amount } = req.body;
    // set data into 
    // Create customer details
    const customerDetails = new CFCustomerDetails();
    customerDetails.customerId = booking_id; // Use booking_id as the customer ID
    customerDetails.customerPhone = phone_number; // Use phone_number for customer phone
    customerDetails.customerEmail = email; // Use email for customer email

    // Create order request
    const orderRequest = new CFOrderRequest();
    orderRequest.orderAmount = amount; // Use amount for order amount
    orderRequest.orderCurrency = "INR";
    orderRequest.customerDetails = customerDetails;

    // Initialize payment gateway instance and create the order
    const apiInstance = new CFPaymentGateway();
    const response = await apiInstance.orderCreate(cfConfig, orderRequest);

    // Handle successful order creation
    if (response) {
      res.cookie("payment_session_id", response.cfOrder.paymentSessionId, { httpOnly: true });
      res.cookie("order_id", response.cfOrder.orderId, { httpOnly: true });
      res.status(200).json({
        orderId: response.cfOrder.orderId,
        paymentSessionId: response.cfOrder.paymentSessionId,
      });
    }
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ message: "Failed to create order", error });
  }
};
// Pay using Card
export const paybycard = async (req, res) => {
  try {
    const { cardNumber, cardCvv, cardExpiryMm, cardExpiryYy, cardHolderName } = req.body;
    const paymentSessionId = req.cookies.payment_session_id;

    const card = new CFCard();
    card.channel = "link";
    card.cardNumber = cardNumber;
    card.cardCvv = cardCvv;
    card.cardExpiryMm = cardExpiryMm;
    card.cardExpiryYy = cardExpiryYy;
    card.cardHolderName = cardHolderName;

    const cardPayment = new CFCardPayment();
    cardPayment.card = card;

    const orderPayRequest = new CFOrderPayRequest();
    orderPayRequest.paymentSessionId = paymentSessionId;
    orderPayRequest.paymentMethod = cardPayment;

    const apiInstance = new CFPaymentGateway();
    const response = await apiInstance.orderSessionsPay(cfConfig, orderPayRequest);

    res.status(200).json(response);


  } catch (error) {
    console.error("Error processing card payment:", error);
    res.status(500).json({ message: "Card payment failed", error });
  }
};

// Pay using UPI
export const paybyupi = async (req, res) => {
  try {
    const paymentSessionId = req.cookies.payment_session_id;

    const upi = new CFUPI();
    upi.channel = CFUPI.ChannelEnum.Link;

    const upiPayment = new CFUPIPayment();
    upiPayment.upi = upi;

    const orderPayRequest = new CFOrderPayRequest();
    orderPayRequest.paymentSessionId = paymentSessionId;
    orderPayRequest.paymentMethod = upiPayment;

    const apiInstance = new CFPaymentGateway();
    const response = await apiInstance.orderSessionsPay(cfConfig, orderPayRequest);

    // Extract the response details
    const cashfreeResponse = response.cfOrderPayResponse?.data;

    if (!cashfreeResponse) {
      return res.status(500).json({ message: "Invalid Cashfree response" });
    }

    res.status(200).json(response);
  } catch (error) {
    console.error("Error processing UPI payment:", error);
    res.status(500).json({ message: "UPI payment failed", error });
  }
};

// Pay using UPI QR
export const paybyupiqr = async (req, res) => {
  try {
    const paymentSessionId = req.cookies.payment_session_id;
    console.log("paymentSessionId=====", paymentSessionId);

    const upi = new CFUPI();
    upi.channel = CFUPI.ChannelEnum.Qrcode;

    const upiPayment = new CFUPIPayment();
    upiPayment.upi = upi;

    const orderPayRequest = new CFOrderPayRequest();
    orderPayRequest.paymentSessionId = paymentSessionId;
    orderPayRequest.paymentMethod = upiPayment;

    const apiInstance = new CFPaymentGateway();
    const response = await apiInstance.orderSessionsPay(cfConfig, orderPayRequest);

    res.status(200).json(response.cfOrderPayResponse.data.payload.qrcode);
  } catch (error) {
    console.error("Error processing UPI QR payment:", error);
    res.status(500).json({ message: "UPI QR payment failed", error });
  }
};

// Pay using Netbanking
export const paybynetwork = async (req, res) => {
  try {
    const paymentSessionId = req.cookies.payment_session_id;

    const netBanking = new CFNetbanking();
    netBanking.channel = "link";
    netBanking.netbankingBankCode = 3058; // Sample bank code

    const paymentMethod = new CFPaymentMethod();
    paymentMethod.netbanking = netBanking;

    const orderPayRequest = new CFOrderPayRequest();
    orderPayRequest.paymentSessionId = paymentSessionId;
    orderPayRequest.paymentMethod = paymentMethod;

    const apiInstance = new CFPaymentGateway();
    const response = await apiInstance.orderSessionsPay(cfConfig, orderPayRequest);

    res.status(200).json(response.cfOrderPayResponse.data.url);
  } catch (error) {
    console.error("Error processing netbanking payment:", error);
    res.status(500).json({ message: "Netbanking payment failed", error });
  }
};

// Initiate Refund
export const initiaterefund = async (req, res) => {
  try {
    const { orderId, refundAmount, refundId, refundNote } = req.body;

    const refundRequest = new CFRefundRequest();
    refundRequest.refundAmount = refundAmount;
    refundRequest.refundId = refundId;
    refundRequest.refundNote = refundNote;

    const apiInstance = new CFPaymentGateway();
    const response = await apiInstance.createRefund(cfConfig, orderId, refundRequest);

    res.status(200).json(response);
  } catch (error) {
    console.error("Error initiating refund:", error);
    res.status(500).json({ message: "Refund failed", error });
  }
};

// Get Order Details
export const getorderdetails = async (req, res) => {
  try {
    const orderId = req.cookies.order_id;

    const apiInstance = new CFPaymentGateway();
    const response = await apiInstance.getOrder(cfConfig, orderId);

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({ message: "Failed to fetch order details", error });
  }
};

// Pay using Wallet
export const paybywallet = async (req, res) => {
  try {
    const { phone, provider } = req.body;
    const paymentSessionId = req.cookies.payment_session_id;

    const app = new CFApp();
    app.channel = CFApp.ChannelEnum.Link;
    app.phone = phone;
    app.provider = provider;

    const appPayment = new CFAppPayment();
    appPayment.app = app;

    const orderPayRequest = new CFOrderPayRequest();
    orderPayRequest.paymentSessionId = paymentSessionId;
    orderPayRequest.paymentMethod = appPayment;

    const apiInstance = new CFPaymentGateway();
    const response = await apiInstance.orderSessionsPay(cfConfig, orderPayRequest);

    res.status(200).json(response);
  } catch (error) {
    console.error("Error processing wallet payment:", error);
    res.status(500).json({ message: "Wallet payment failed", error });
  }
};

export const dtailedoforder = async (req, res) => {
  console.log("req.cookies for derailedoforder", req.cookies.token.order_id)
  try {
    var apiInstance = new CFPaymentGateway();
    var cfOrderResponse = await apiInstance.getOrder(
      cfConfig,
      req.cookies.token.order_id
    );

    if (cfOrderResponse != null) {
      console.log("result.OrderId");
      res.status(200).json(cfOrderResponse);
      console.log(cfOrderResponse?.cfOrder?.orderId);
      console.log(cfOrderResponse?.cfOrder?.payments);
      console.log(cfOrderResponse?.cfHeaders);
    }
  } catch (e) {
    console.log(e);
    res.status(500).json(e)
  }
}

export const refundinformation = async (req, res) => {
  try {
    var apiInstance = new CFPaymentGateway();
    const order_id_for_refund = order_id//order id
    var response = await apiInstance.getRefund(
      cfConfig,
      order_id_for_refund,
      "5114911205038"
    );
    if (response != null) {
      res.status(200).json(response)
      console.log("response.cfRefund.RefundAmount");
      console.log(response?.cfRefund?.refundAmount);
      console.log(response?.cfHeaders);
    }
  } catch (e) {
    console.log(e);
    res.status(500).json(e)
  }

}

//its  not   use yet
export const paylater = async () => {
  const data = req.body;
  try {
    var cfApp = new CFApp();
    cfApp.channel = CFApp.ChannelEnum.Link;
    cfApp.phone = data.phone;
    cfApp.provider = "test";
    var cFAppPayment = new CFAppPayment();
    cFAppPayment.app = cfApp;
    var cFOrderPayRequest = new CFOrderPayRequest();
    cFOrderPayRequest.paymentSessionId = req.cookies.token.payment_session_id;
    cFOrderPayRequest.paymentMethod = cFAppPayment;
    var apiInstance = new CFPaymentGateway();
    var cfPayResponse = await apiInstance.orderSessionsPay(
      cfConfig,
      cFOrderPayRequest
    );
    if (cfPayResponse != null) {
      console.log("result.OrderId");
      console.log(cfPayResponse?.cfOrderPayResponse?.paymentMethod);
      console.log(cfPayResponse?.cfOrderPayResponse?.data?.url);
      console.log(cfPayResponse?.cfHeaders);
    }
  } catch (e) {
    console.log(e);
  }
}

export const checkPaymentStatus = async (req, res) => {
  try {
    const orderId = req.cookies?.order_id; // Retrieve the order ID from cookies
    console.log("Order ID:", orderId);

    // Ensure orderId is present
    if (!orderId) {
      return res.status(400).json({ message: "Order ID is missing from cookies" });
    }

    const apiInstance = new CFPaymentGateway();
    const response = await apiInstance.getOrder(cfConfig, orderId);

    // Check if cfOrder exists in the response
    if (response?.cfOrder) {
      const { orderStatus, payments } = response.cfOrder;
      const paymentMethods = payments ? payments.map(payment => payment.paymentMethod) : null; // Extract payment methods

      // Log payments to check structure
      console.log("Payments Data:", payments);

      // Check if the payment was successful
      if (orderStatus === "PAID") {
        return res.status(200).json({
          message: "Payment was successful",
          orderDetails: response.cfOrder,
          paymentMethods: paymentMethods || "No payment methods found", // Send payment methods if available
        });
      } else {
        return res.status(200).json({
          message: "Payment status is not PAID",
          orderStatus,
          payments: payments || "No payment data available",
          paymentMethods: paymentMethods || "No payment methods found",
        });
      }
    } else {
      return res.status(404).json({ message: "Order not found in the system" });
    }
  } catch (error) {
    console.error("Error fetching payment status:", error);
    res.status(500).json({ message: "Failed to fetch payment status", error: error.message });
  }
};







// Create an order
export const createOrder = async (req, res) => {
  try {
    const {
      amount,
      ticketId = uuidv4(), // Generate a unique ticket ID
      TicketType = "single",
      person = 1,
      Fullname = "Dhananjay",
      Email = "nimbalkar@gmail.com",
      Mobile_No = 7350304620,
      bookingId = 10,
    } = req.body;
    console.log(selectedGateway);
    console.log(ticketId);

    const options = {
      amount: (amount || 1) * 100, // Razorpay requires the amount in paisa
      currency: "INR",
      receipt: ticketId, // Use the unique ticket ID as the receipt (or a reference)
    };

    res.cookie('bookingId', bookingId, { httpOnly: true, secure: true });

    instance.orders.create(options, (err, order) => {
      if (err) {
        console.error("Error creating order:", err);
        return res.status(500).json({
          success: false,
          message: "Failed to create Razorpay order",
          error: err.message,
        });
      }
      res.render("checkout", {
        amount: order.amount,
        order_id: order.id, // Razorpay order ID
        Email,
        Mobile_No,
      });
    });
  } catch (error) {
    console.error("Error in createOrder:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.stack,
    });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.cookies;
    const bookingId = req.cookies?.bookingId;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing Razorpay payment details",
      });
    }

    // Validate signature
    const generatedSignature = crypto
      .createHmac("sha256", 'QEQ5f4BfTH7fxhE1iXSkrK1y') // Replace with your Razorpay secret key
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    const paymentDetails = await checkPaymentStatusRazorpay(razorpay_payment_id);
    console.log(paymentDetails, "this is payment details");

    await client.query("BEGIN"); // Start a transaction

    const bookingExists = await client.query("SELECT id, event_id FROM bookings WHERE id = $1", [bookingId]);

    if (bookingExists.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    // Insert payment details into the database
    const paymentResult = await client.query(
      `INSERT INTO payments 
        (booking_id, amount, status, payment_method, transaction_id,payment_gateway) 
        VALUES ($1, $2, $3, $4, $5,$6) 
        RETURNING *`,
      [
        bookingId,
        paymentDetails.amount,
        paymentDetails.status,
        paymentDetails.method,
        paymentDetails.id,
        'razorpay'
      ]
    );
    console.log(paymentResult, "Updated payment details ");

    // Update the booking status
    const bookingUpdate = await client.query(
      `UPDATE bookings 
        SET status = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2 
        RETURNING *`,
      ["confirmed", bookingId]
    );

    // Update the ticket table with the razorpay_order_id as ticket_id and set the status to 'confirmed'
    const ticketUpdate = await client.query(
      `UPDATE tickets 
        SET id = $1, status = 'confirmed'
        WHERE booking_id = $2
        RETURNING *`,
      [razorpay_order_id, bookingId]
    );

    // Log the updated ticket table
    console.log("Updated ticket:", ticketUpdate.rows[0]);

    await client.query("COMMIT"); // Commit the transaction

    return res.status(200).json({
      success: true,
      message: "Payment verified and booking updated successfully.",
      payment: paymentResult.rows[0],
      booking: bookingUpdate.rows[0],
      ticket: ticketUpdate.rows[0],  // Returning the updated ticket details
    });
  } catch (error) {
    console.error("Error in verifyPayment:", error);
    await client.query("ROLLBACK");
    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong",
      error: error.stack,
    });
  }
};




export const processRefund = async (req, res) => {
  try {
    const { paymentId, refundAmount } = req.body;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: "Payment ID is required to process a refund.",
      });
    }

    // Prepare refund options
    const refundOptions = {
      payment_id: paymentId,
      amount: refundAmount * 100, // Convert to paisa
    };

    // Create a refund
    const refund = await razorpayInstance.payments.refund(refundOptions);

    console.log("Refund details:", refund);

    // Log the refund details in your database
    const refundRecord = await client.query(
      `INSERT INTO refunds (transaction_id, refund_id, amount, status) VALUES ($1, $2, $3, $4) RETURNING *`,
      [
        refund.payment_id,
        refund.id,
        refund.amount / 100, // Convert back to INR
        refund.status,
      ]
    );

    console.log("Refund record inserted:", refundRecord.rows[0]);

    return res.status(200).json({
      success: true,
      message: "Refund processed successfully.",
      refund: refund,
    });
  } catch (error) {
    console.error("Error processing refund:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to process the refund.",
      error: error.stack,
    });
  }
};




// PhonePe Controller
export const PhonePay = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount) {
      return res.status(400).json({ success: false, message: "Amount is required." });
    }

    const userId = "MUID123";
    const merchantTransactionId = uniqid();

    const normalPayLoad = {
      merchantId: process.env.MERCHANT_ID,
      merchantTransactionId,
      merchantUserId: userId,
      amount: amount * 100,
      redirectUrl: `${APP_BE_URL}/payment/validate/${merchantTransactionId}`,
      redirectMode: "REDIRECT",
      mobileNumber: "9999999999",
      paymentInstrument: {
        type: "PAY_PAGE",
      },
    };

    const base64EncodedPayload = Buffer.from(JSON.stringify(normalPayLoad), "utf8").toString("base64");
    const stringToHash = base64EncodedPayload + "/pg/v1/pay" + SALT_KEY;
    const sha256_val = sha256(stringToHash);
    const xVerifyChecksum = sha256_val + "###" + SALT_INDEX;

    const response = await axios.post(`${PHONE_PE_HOST_URL}/pg/v1/pay`,
      { request: base64EncodedPayload },
      {
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": xVerifyChecksum,
          accept: "application/json",
        },
      }
    );

    if (response.data?.data?.instrumentResponse) {
      res.status(200).json({
        success: true,
        data: { redirectUrl: response.data.data.instrumentResponse.redirectInfo.url },
        message: "Payment initiated successfully."
      });
    } else {
      res.status(400).json({ success: false, message: "Payment initiation failed." });
    }
  } catch (error) {
    console.error("Payment initiation error:", error.response?.data || error.message);
    res.status(500).json({ success: false, message: error.response?.data || error.message });
  }
};

// Payment Status
export const PaymentStatus = async (req, res) => {
  try {
    const { merchantTransactionId } = req.params;

    if (!merchantTransactionId) {
      return res.status(400).json({ success: false, message: "Merchant Transaction ID is required" });
    }

    const statusUrl = `${PHONE_PE_HOST_URL}/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}`;
    const stringToHash = `/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}` + SALT_KEY;
    const sha256_val = sha256(stringToHash);
    const xVerifyChecksum = sha256_val + "###" + SALT_INDEX;

    const response = await axios.get(statusUrl, {
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": xVerifyChecksum,
        "X-MERCHANT-ID": MERCHANT_ID,
        accept: "application/json",
      },
    });

    if (response.data?.code === "PAYMENT_SUCCESS") {
      res.status(200).json({
        success: true,
        data: response.data,
        message: "Payment successful."
      });
    } else {
      res.status(400).json({
        success: false,
        message: `Payment not successful. Status: ${response.data.code}`
      });
    }
  } catch (error) {
    console.error("Payment status check error:", error.response?.data || error.message);
    res.status(500).json({ success: false, message: error.response?.data || error.message });
  }
};
