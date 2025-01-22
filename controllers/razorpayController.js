
import crypto from 'crypto';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import client from '../config.js';
import { instance } from "../config2.js";
import { checkPaymentStatusRazorpay } from "../services/paymentService.js";
dotenv.config();
// Create an order

export const createOrder = async (req, res) => {
  try {
    let {
      amount = 1,
      TicketType = "single",
      person = 1,
      Fullname = "Dhananjay",
      Email = "nimbalkar@gmail.com",
      Mobile_No = 7350304620,
      bookingId = "booked4GXKK2092", // Existing booking ID
    } = req.body;

    // Create Razorpay order
    const options = {
      amount: amount * 100, // Razorpay requires amount in paisa
      currency: "INR",
      receipt: bookingId,
    };
    const order = await instance.orders.create(options);

    // Begin database transaction
    await client.query("BEGIN");

    // Debug: Log Razorpay order ID
    console.log("Razorpay Order ID:", order.id);

    // Update the booking table with the Razorpay order ID
    const updateBookingQuery = `
      UPDATE bookings
      SET booking_id = $1, updated_at = CURRENT_TIMESTAMP
      WHERE booking_id = $2
      RETURNING *;
    `;
    const updatedBooking = await client.query(updateBookingQuery, [
      order.id, // Razorpay order ID
      bookingId, // Existing booking ID
    ]);
    console.log("Updated Booking Record:", updatedBooking.rows);

    if (updatedBooking.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "No booking record found to update.",
      });
    }

    // Commit transaction after successful update
    await client.query("COMMIT");

    // Set the updated booking ID as a cookie
    res.cookie("bookingId", order.id, { httpOnly: true, secure: true });

    // Render the checkout page
    res.render("checkout", {
      amount: order.amount,
      order_id: order.id,
      Email,
      Mobile_No,
      bookingId: order.id, // Pass updated booking ID
    });
  } catch (error) {
    console.error("Error in createOrder:", error);

    // Rollback the transaction in case of error
    await client.query("ROLLBACK");

    res.status(500).json({
      success: false,
      message: "Failed to create Razorpay order and update booking table",
      error: error.message,
    });
  }
};


import { generateTickets } from '../services/ticketService.js';

export const verifyPayment = async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.cookies;

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return res.status(400).json({
      success: false,
      message: "Missing Razorpay payment details",
    });
  }

  try {
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    const paymentDetails = await checkPaymentStatusRazorpay(razorpay_payment_id);

    await client.query("BEGIN");

    // Fetch booking and event details
    const bookingQuery = `SELECT * FROM bookings WHERE booking_id = $1`;
    const bookingResult = await client.query(bookingQuery, [razorpay_order_id]);

    if (bookingResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    const booking = bookingResult.rows[0];
    const { event_id, ticket_types, user_id, booking_id } = booking;
  console.log("check direct booking", booking);
    let parsedTicketTypes;
    try {
      parsedTicketTypes = typeof ticket_types === "string" ? JSON.parse(ticket_types) : ticket_types;
    } catch (error) {
      throw new Error("Invalid ticket_types format. Expected valid JSON.");
    }

    console.log("parsed ticket type ", parsedTicketTypes);

    // Insert payment details
    const paymentInsertQuery = `
      INSERT INTO payments (
        booking_id, event_id, amount, status, payment_method, transaction_id, payment_gateway
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const paymentResult = await client.query(paymentInsertQuery, [
      razorpay_order_id,
      event_id,
      paymentDetails.amount / 100,
      paymentDetails.status,
      paymentDetails.method,
      paymentDetails.id,
      "razorpay",
    ]);

    // Update booking status
    const bookingUpdateQuery = `
      UPDATE bookings
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE booking_id = $2
      RETURNING *
    `;
    const bookingUpdate = await client.query(bookingUpdateQuery, [
      "confirmed", // Change status to 'confirmed'
      razorpay_order_id,
    ]);

    const ticket_count = bookingUpdate.rows[0].ticket_quantity;

    console.log("Data before ticket generation", {
      booking_id,
      event_id,
      ticket_types: parsedTicketTypes,
      ticket_count,
      user_id,
    });

    // Generate and insert tickets after payment
    const tickets = await generateTickets({
      booking_id,
      event_id,
      ticket_types: parsedTicketTypes,
      ticket_count,
      user_id,
    });
    console.log("Ticket is bought successfully", tickets);

    await client.query("COMMIT");

    res.status(200).json({
      success: true,
      message: "Payment verified, booking updated, and tickets generated successfully.",
      payment: paymentResult.rows[0],
      booking: bookingUpdate.rows[0],
      tickets,
    });
  } catch (error) {
    console.error("Error in verifyPayment:", error);

    await client.query("ROLLBACK");

    res.status(500).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};


// const generateTicketsAfterPayment = async (ticketTypes, bookingId, eventId, userId) => {
//   const tickets = [];
//   for (const ticketType of ticketTypes) {
//     for (let i = 0; i < ticketType.quantity; i++) {
//       const ticketId = uuidv4(); // Generate a unique ticket ID
//       tickets.push(ticketId);

//       const ticketInsertQuery = `
//         INSERT INTO tickets (ticket_id, booking_id, event_id, user_id, ticket_type, status)
//         VALUES ($1, $2, $3, $4, $5, $6)
//       `;
//       await client.query(ticketInsertQuery, [
//         ticketId,
//         bookingId,
//         eventId,
//         userId,
//         ticketType.type,
//         'confirmed', // Ticket status set to 'confirmed'
//       ]);
//     }
//   }

//   return tickets;
// };
export const processRefund = async (req, res) => {
  try {
    const { paymentId, refundAmount } = req.body;

    // Validate request body
    if (!paymentId || !refundAmount) {
      return res.status(400).json({
        success: false,
        message: "Payment ID and refund amount are required.",
      });
    }

    // Prepare refund options
    const refundOptions = {
      amount: refundAmount * 100, // Convert INR to paise
      speed: "normal",
      notes: {
        notes_key_1: "Beam me up Scotty.",
        notes_key_2: "Engage",
      },
      receipt: `Receipt_${Date.now()}`, // Unique receipt identifier
    };

    // Process refund
    const refund = await instance.payments.refund(paymentId, refundOptions);

    console.log("Refund successful:", refund);

    // Insert refund details into the database
    const refundRecord = await client.query(
      `INSERT INTO refunds (transaction_id, refund_id, amount, status) VALUES ($1, $2, $3, $4) RETURNING *`,
      [
        refund.payment_id,         // Payment ID of the refund
        refund.id,                 // Unique Refund ID
        refund.amount / 100,       // Convert back to INR
        refund.status,             // Refund status
      ]
    );

    console.log("Refund record inserted into database:", refundRecord.rows[0]);

    // Respond to the client
    return res.status(200).json({
      success: true,
      message: "Refund processed and logged successfully.",
      refund: refund,
      refundRecord: refundRecord.rows[0],
    });
  } catch (error) {
    console.error("Refund API Error Details:", error.response ? error.response.data : error);

    // Handle error response
    return res.status(500).json({
      success: false,
      message: "Failed to process refund.",
      error: error.response ? error.response.data : error.message,
    });
  }
};




