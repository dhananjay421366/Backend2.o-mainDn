import {
  CFApp,
  CFAppPayment,
  CFCard,
  CFCardPayment,
  CFConfig,
  CFCustomerDetails,
  CFEnvironment,
  CFNetbanking,
  CFOrderMeta,
  CFOrderPayRequest,
  CFOrderRequest,
  CFPaymentGateway,
  CFPaymentMethod,
  CFRefundRequest,
  CFUPI,
  CFUPIPayment,
} from "cashfree-pg-sdk-nodejs";
import dotenv from "dotenv";
import { generateBookingId, generateTickets } from "../services/ticketService.js";
import db from "../config.js";
import { createBooking } from "../services/bookingService.js";
dotenv.config();

// Initialize Cashfree configuration with the environment and credentials
const cfConfig = new CFConfig(
  CFEnvironment.SANDBOX,
  "2023-08-01",
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET
);



/**
 * Create an order with Cashfree
 */
// export const createOrderCashfree = async (req, res) => {
//   try {
//     const booking_id = generateBookingId();
//     const {
//       event_id,
//       user_id,
//       ticket_types,
//       user_email,
//       user_name,
//       user_phone,
//     } = req.body;

//     const amount = ticket_types.reduce(
//       (total, ticket) => total + ticket.quantity * ticket.price,
//       0
//     );

//     const customerDetails = new CFCustomerDetails();
//     customerDetails.customerId = booking_id;
//     customerDetails.customerPhone = String(user_phone);
//     customerDetails.customerEmail = user_email;
//     customerDetails.customerEvent_id = event_id;

//     const orderMeta = new CFOrderMeta();
//     orderMeta.notifyUrl = `https://ab45-2409-40c2-8044-a097-85d-2927-cefc-2d9c.ngrok-free.app/api/webhook/notify`;

//     const orderRequest = new CFOrderRequest();
//     orderRequest.orderAmount = amount;
//     orderRequest.orderCurrency = "INR";
//     orderRequest.customerDetails = customerDetails;
//     orderRequest.orderMeta = orderMeta;



//     const apiInstance = new CFPaymentGateway();
//     const response = await apiInstance.orderCreate(cfConfig, orderRequest);
//     // console.log(response, "This is an response")

//     if (response) {
//       const orderId = response.cfOrder.orderId;
//       const paymentSessionId = response.cfOrder.paymentSessionId;


//       // Store booking details in DB
//       const ticketQuantity = ticket_types.reduce(
//         (sum, ticket) => sum + ticket.quantity,
//         0
//       );
//       const insertQuery = `
//         INSERT INTO bookings (booking_id, event_id, user_id, user_email, user_name, ticket_types, ticket_quantity, status)
//         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
//       `;

//       await db.query(insertQuery, [
//         booking_id,
//         event_id,
//         user_id,
//         user_email,
//         user_name,
//         JSON.stringify(ticket_types),
//         ticketQuantity,
//         "pending",
//       ]);

//       // Set cookies
//       res.cookie("payment_session_id", paymentSessionId, { httpOnly: true });
//       res.cookie("order_id", orderId, { httpOnly: true });
//       res.cookie("booking_id", booking_id, { httpOnly: true });

//       res.status(200).json({
//         orderId,
//         paymentSessionId,
//         calculatedAmount: amount,
//         bookingId: booking_id,
//       });
//     }
//   } catch (error) {
//     console.error("Error creating order:", error);
//     res.status(500).json({ message: "Failed to create order", error });
//   }
// };

export const createOrderCashfree = async (req, res) => {
  try {
    const booking_id = generateBookingId();
    const {
      event_id,
      user_id,
      ticket_types,
      user_email,
      user_name,
      user_phone,
    } = req.body;

    const amount = ticket_types.reduce(
      (total, ticket) => total + ticket.quantity * ticket.price,
      0
    );

    const customerDetails = new CFCustomerDetails();
    customerDetails.customerId = booking_id;
    customerDetails.customerPhone = String(user_phone);
    customerDetails.customerEmail = user_email;
    customerDetails.customerEvent_id = event_id;

    const orderMeta = new CFOrderMeta();
    orderMeta.notifyUrl = "https://ab45-2409-40c2-8044-a097-85d-2927-cefc-2d9c.ngrok-free.app/api/webhook/notify";

    const orderRequest = new CFOrderRequest();
    orderRequest.orderAmount = amount;
    orderRequest.orderCurrency = "INR";
    orderRequest.customerDetails = customerDetails;
    orderRequest.orderMeta = orderMeta;

    const apiInstance = new CFPaymentGateway();
    const response = await apiInstance.orderCreate(cfConfig, orderRequest);

    if (response) {
      const orderId = response.cfOrder.orderId;
      const paymentSessionId = response.cfOrder.paymentSessionId;

      // Store booking details in DB using createBooking helper
      await createBooking({ event_id, user_id, ticket_types, user_email, user_name }, booking_id);

      // Set cookies
      res.cookie("payment_session_id", paymentSessionId, { httpOnly: true });
      res.cookie("order_id", orderId, { httpOnly: true });
      res.cookie("booking_id", booking_id, { httpOnly: true });

      res.status(200).json({
        orderId,
        paymentSessionId,
        calculatedAmount: amount,
        bookingId: booking_id,
      });
    }
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ message: "Failed to create order", error });
  }
};


// ✅ Main Function: Pay By Card
export const paybycard = async (req, res) => {
  try {
    const { cardNumber, cardCvv, cardExpiryMm, cardExpiryYy, cardHolderName } =
      req.body;
    const paymentSessionId = req.cookies.payment_session_id;
    const orderId = req.cookies.order_id;

    console.log("Processing Card Payment for Order ID:", orderId);

    if (!paymentSessionId || !orderId) {
      return res
        .status(400)
        .json({ message: "Missing payment session ID or order ID" });
    }

    // ✅ Prepare Card Payment Object
    const card = new CFCard();
    card.channel = "link";
    card.cardNumber = cardNumber;
    card.cardCvv = cardCvv;
    card.cardExpiryMm = cardExpiryMm;
    card.cardExpiryYy = cardExpiryYy;
    card.cardHolderName = cardHolderName;

    const cardPayment = new CFCardPayment();
    cardPayment.card = card;
    console.log(cardPayment)

    // ✅ Prepare Payment Request
    const orderPayRequest = new CFOrderPayRequest();
    orderPayRequest.paymentSessionId = paymentSessionId;
    orderPayRequest.paymentMethod = cardPayment;

    // ✅ Make API Call to Cashfree
    const apiInstance = new CFPaymentGateway();
    const response = await apiInstance.orderSessionsPay(
      cfConfig,
      orderPayRequest
    );

    // console.log("Cashfree Payment Response:", response);

    // If a payment URL is returned, ask the user to complete payment
    if (response?.cfOrderPayResponse?.data?.url) {
      return res.status(200).json({
        message: "Redirect user to complete payment",
        paymentUrl: response.cfOrderPayResponse.data.url,
      });
    }

    // ✅ Call Helper Function to Check Payment Status
    const paymentStatus = await checkPaymentStatus();
    console.log(paymentStatus);

    if (paymentStatus.success) {

      // ✅ Fetch Booking Details
      const bookingQuery = `SELECT booking_id, event_id FROM bookings WHERE booking_id = $1`;
      const bookingResult = await db.query(bookingQuery, [orderId]);

      if (bookingResult.rowCount === 0) {
        console.error("❌ Booking not found for Order ID:", orderId);
        return res.status(400).json({ message: "Booking not found" });
      }

      const { booking_id, event_id } = bookingResult.rows[0];

      // ✅ Insert Payment Record into DB
      const insertPaymentQuery = `
        INSERT INTO payments (amount, payment_method, transaction_id, status, payment_gateway, booking_id, event_id)
        VALUES ($1, $2, $3, 'success', 'Cashfree', $4, $5)
      `;
      await db.query(insertPaymentQuery, [
        paymentStatus.amount,
        paymentStatus.paymentMethod,
        paymentStatus.paymentId,
        booking_id,
        event_id,
      ]);

      console.log("✅ Payment Inserted into DB");

      // ✅ Update Booking Status
      const updateBookingQuery = `
        UPDATE bookings 
        SET status = 'success', updated_at = CURRENT_TIMESTAMP 
        WHERE booking_id = $1
      `;
      await db.query(updateBookingQuery, [booking_id]);

      console.log("✅ Booking Status Updated to Success");

      return res.status(200).json({
        message: "Payment successful",
        transactionId: paymentStatus.paymentId,
        amount: paymentStatus.amount,
        status: "success",
        bookingId: booking_id,
      });
    } else {
      console.error("❌ Payment Failed - Status:", paymentStatus);
      return res.status(400).json({ message: "Payment failed", paymentStatus });
    }
  } catch (error) {
    console.error("❌ Error processing card payment:", error);
    return res.status(500).json({ message: "Card payment failed", error });
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
    const response = await apiInstance.orderSessionsPay(
      cfConfig,
      orderPayRequest
    );

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
    const response = await apiInstance.orderSessionsPay(
      cfConfig,
      orderPayRequest
    );

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
    const response = await apiInstance.orderSessionsPay(
      cfConfig,
      orderPayRequest
    );

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
    const response = await apiInstance.createRefund(
      cfConfig,
      orderId,
      refundRequest
    );

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
    const response = await apiInstance.orderSessionsPay(
      cfConfig,
      orderPayRequest
    );

    res.status(200).json(response);
  } catch (error) {
    console.error("Error processing wallet payment:", error);
    res.status(500).json({ message: "Wallet payment failed", error });
  }
};

export const dtailedoforder = async (req, res) => {
  console.log("req.cookies for derailedoforder", req.cookies.token.order_id);
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
    res.status(500).json(e);
  }
};

export const refundinformation = async (req, res) => {
  try {
    var apiInstance = new CFPaymentGateway();
    const order_id_for_refund = order_id; //order id
    var response = await apiInstance.getRefund(
      cfConfig,
      order_id_for_refund,
      "5114911205038"
    );
    if (response != null) {
      res.status(200).json(response);
      console.log("response.cfRefund.RefundAmount");
      console.log(response?.cfRefund?.refundAmount);
      console.log(response?.cfHeaders);
    }
  } catch (e) {
    console.log(e);
    res.status(500).json(e);
  }
};

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
};




/**
 * Fetch Payment Status from Cashfree
 */
export const checkPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.body;
    console.log(orderId);
    // const orderId = req.cookies?.order_id; // Retrieve the order ID from cookies
    // console.log("Order ID:", orderId);

    // Ensure orderId is present
    if (!(orderId || req.cookies?.order_id)) {
      return res
        .status(400)
        .json({ message: "Order ID is missing from cookies" });
    }

    const apiInstance = new CFPaymentGateway();
    const response = await apiInstance.getOrder(cfConfig, orderId);

    // Log response for debugging
    console.log("API Response:", response);

    // Check if cfOrder exists in the response
    if (response?.cfOrder) {
      const { orderStatus, payments } = response.cfOrder;
      const paymentMethods = payments
        ? payments.map((payment) => payment.paymentMethod)
        : null; // Extract payment methods

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
      return res
        .status(500)
        .json({
          message: "Unexpected error in payment processing",
          error: error.message,
        });
    }

    return res
      .status(500)
      .json({
        message: "Failed to fetch payment status",
        error: error.message,
      });
  }
};

/**
 * Handle Cashfree Notify URL Callbacks
 */
export const handleCashfreeNotify = async (req, res) => {
  try {
    // Log the incoming notification data for debugging
    console.log("Notify URL Data Received:", req.body);

    // Extract necessary fields from request body
    const { order_id } = req.body?.data?.order;
    const { cf_payment_id, payment_amount, payment_status, payment_group } = req.body?.data?.payment;
    const { customer_id } = req.body?.data?.customer_details;

    // Validate required fields
    if (!order_id || !cf_payment_id) {
      return res.status(400).json({ message: "Invalid request payload" });
    }

    // Query to update booking details
    const updateBookingQuery = `
      UPDATE bookings
      SET booking_id = $1, updated_at = CURRENT_TIMESTAMP
      WHERE booking_id = $2
      RETURNING *;
    `;

    // Execute query to update booking table
    const updatedBooking = await db.query(updateBookingQuery, [
      order_id,
      customer_id,
    ]);

    // Check if the booking record exists
    if (updatedBooking.rowCount === 0) {
      await db.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "No booking record found to update.",
      });
    }

    // Fetch booking details
    const bookingQuery = `SELECT * FROM bookings WHERE booking_id = $1`;
    const bookingResult = await db.query(bookingQuery, [order_id]);

    if (bookingResult.rows.length === 0) {
      await db.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "Invalid booking ID" });
    }

    const booking = bookingResult.rows[0];
    const { event_id, ticket_types, user_email, user_name, ticket_quantity, user_id } = booking;

    // Parse ticket types if stored as string
    let parsedTicketTypes = typeof ticket_types === "string" ? JSON.parse(ticket_types) : ticket_types;

    // Fetch event details
    const eventQuery = `SELECT name, venue, date, event_time, available_tickets, tickets FROM events WHERE event_id = $1`;
    const eventResult = await db.query(eventQuery, [event_id]);

    if (eventResult.rows.length === 0) {
      throw new Error("Event not found.");
    }

    const eventDetails = eventResult.rows[0];
    console.log("Event details:", eventDetails);
    const availableTickets = eventDetails.available_tickets;

    // Check ticket availability
    if (ticket_quantity > availableTickets) {
      await db.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: `Insufficient available tickets. Only ${availableTickets} tickets are left.`,
      });
    }

    // Generate tickets for the user
    const tickets = await generateTickets({
      booking_id: order_id,
      event_id,
      ticket_types: parsedTicketTypes,
      ticket_count: ticket_quantity,
      user_id,
    });

    // Update event's available tickets and tickets array
    const updatedAvailableTickets = availableTickets - ticket_quantity;
    const updatedTickets = eventDetails.tickets.map(ticket => {
      const purchasedTicket = parsedTicketTypes.find(pt => pt.type === ticket.type);
      if (purchasedTicket) {
        ticket.available_tickets -= purchasedTicket.quantity;
      }
      return ticket;
    });

    // Query to update event details
    const updateEventQuery = `
      UPDATE events 
      SET available_tickets = $1, tickets = $2, updated_at = CURRENT_TIMESTAMP
      WHERE event_id = $3
      RETURNING available_tickets, tickets;
    `;
    await db.query(updateEventQuery, [
      updatedAvailableTickets,
      JSON.stringify(updatedTickets),
      event_id,
    ]);

    // Commit transaction after successful update
    await db.query("COMMIT");

    // Insert or update payment details
    const query = `
      INSERT INTO payments (booking_id, event_id, amount, status, payment_method, transaction_id, payment_gateway)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const paymentResult = await db.query(query, [
      order_id,
      event_id,
      payment_amount,
      payment_status.toLowerCase(),
      payment_group,
      cf_payment_id,
      "Cashfree",
    ]);

    // Update booking status to confirmed
    const bookingUpdateQuery = `
      UPDATE bookings 
      SET status = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE booking_id = $2 
      RETURNING *;
    `;
    const bookingUpdate = await db.query(bookingUpdateQuery, ["confirmed", order_id]);

    res.status(200).json({
      success: true,
      message: "Payment verified, booking updated, tickets generated, and confirmation email sent successfully.",
      payment: paymentResult.rows[0],
      booking: bookingUpdate.rows[0],
      tickets,
    });
  } catch (error) {
    console.error("Error processing Notify URL:", error);
    return res.status(500).json({ success: false, message: "Failed to process notification" });
  }
};


/**
 * Handle Cashfree Webhook
 */
export const checkWebhook = async (req, res) => {
  // console.log("req.rawBody", req.body);
  // console.log("req.rawHeader", req.Header);
  // return res.status(200).send('Webhook received');
  // try {

  //   try {
  //     // Verify the signature
  //     cfConfig.PGVerifyWebhookSignature(
  //       req.headers["x-webhook-signature"],
  //       req.body.data,
  //       req.headers["x-webhook-timestamp"]
  //     );
  //   } catch ( webhookVerificationError ) {
  //     console.error("Webhook verification failed:", webhookVerificationError);
  //     return res.status(400).send("Webhook verification failed");
  //   }

  //   // check for payload data
  //   if (!req.body.data) {
  //     return res.status(400).send("Invalid payload data");
  //   }

  //   const { order, payment, customer_details, payment_gateway_details } = req.body.data;

  //   const { order_id } = order;

  //   // extracting the payement details 
  //   const { payment_status, payment_amount, payment_group, cf_payment_id } = payment;

  //   //use customer_id as booking_id
  //   const { customer_id } = customer_details;

  //   //transaction start
  //   await db.query('BEGIN');
  //   // update booking table status to booked
  //   const queryForTickets = `
  //     UPDATE bookings 
  //     SET status = $2 
  //     WHERE id = $1
  //     RETURNING event_id, ticket_type
  //   `;
  //   const valuesForTickets = [customer_id, payment_status]; //using customer_id as booking_id
  //   let resultForTickets;

  //   resultForTickets = await db.query(queryForTickets, valuesForTickets);
  //   if (resultForTickets.rows.length === 0) {
  //     return res.status(404).json({ error: "Booking not found" });
  //   }

  //   const { event_id, ticket_type } = resultForTickets.rows[0];

  //   if (payment_status === 'SUCCESS') {
  //     //Insert into tickets table
  //     const queryForTicketsInsert = `
  //       INSERT INTO tickets (booking_id, event_id, ticket_type, status) 
  //       VALUES ($1, $2, $3, $4)
  //     `;
  //     try {
  //       const valuesForTicketsInsert = [customer_id, event_id, ticket_type, payment_status];
  //       const resultForTicketsInsert = await db.query(queryForTicketsInsert, valuesForTicketsInsert);
  //     } catch (err) {
  //       await db.query('ROLLBACK');
  //       return res.status(400).json({ error: err });
  //     }
  //   }

  //   // insert payment details
  //   const query = `
  //     INSERT INTO payments (booking_id, amount, status, payment_method, transaction_id, order_id, event_id) 
  //     VALUES ($1, $2, $3, $4, $5, $6, $7)
  //   `;
  //   const values = [customer_id, payment_amount, payment_status, payment_group, cf_payment_id, order_id, event_id];
  //   const result = await db.query(query, values);

  //   await db.query('COMMIT');
  //   res.status(200).send('Webhook received');

  // } catch (err) {
  //   console.error('unexpected internal error occurred: ', err.message)
  //   await db.query('ROLLBACK');
  //   return res.status(500).json({ error: 'An internal server error occurred' });
  // }

};

