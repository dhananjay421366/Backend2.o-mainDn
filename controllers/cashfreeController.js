import { CFApp, CFAppPayment, CFCard, CFCardPayment, CFConfig, CFCustomerDetails, CFEnvironment, CFNetbanking, CFOrderPayRequest, CFOrderRequest, CFPaymentGateway, CFPaymentMethod, CFRefundRequest, CFUPI, CFUPIPayment } from "cashfree-pg-sdk-nodejs";
import dotenv from 'dotenv';
dotenv.config();

// Initialize Cashfree configuration with the environment and credentials
const cfConfig = new CFConfig(
  CFEnvironment.SANDBOX,
  "2023-08-01",
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET
);

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

//its not use yet
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

    // Log response for debugging
    console.log("API Response:", response);

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

    // Handle errors gracefully
    if (error instanceof TypeError) {
      return res.status(500).json({ message: "Unexpected error in payment processing", error: error.message });
    }

    return res.status(500).json({ message: "Failed to fetch payment status", error: error.message });
  }
};

