
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
      ticketId = uuidv4(),
      TicketType = "single",
      person = 1,
      Fullname = "Dhananjay",
      Email = "nimbalkar@gmail.com",
      Mobile_No = 7350304620,
      bookingId = "bookId38RGEZZTD", // Existing booking ID
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

    // Check if the ticket exists before trying to update
    const checkTicketQuery = `SELECT * FROM tickets WHERE booking_id = $1`;
    const checkTicket = await client.query(checkTicketQuery, [bookingId]);
    console.log("Ticket Record Check:", checkTicket.rows);

    if (checkTicket.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "No ticket record found to update.",
      });
    }

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

    // Update `bookingId` to the new Razorpay order ID
    bookingId = updatedBooking.rows[0].booking_id;

    // Update the ticket table with the Razorpay order ID
    const updateTicketQuery = `
      UPDATE tickets
      SET booking_id = $1
      WHERE TRIM(booking_id) = TRIM($2)
      RETURNING *;
    `;
    console.log("Updating Ticket with Booking ID:", bookingId.trim());
    const updatedTicket = await client.query(updateTicketQuery, [
      order.id, // Razorpay order ID
      bookingId.trim(), // Trimmed booking ID
    ]);
    console.log("Updated Ticket Record:", updatedTicket.rows);

    if (updatedTicket.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "No ticket record found to update.",
      });
    }
    // Debug: Confirm row updates with SELECT query
    const debugQuery = `SELECT * FROM tickets WHERE TRIM(booking_id) = TRIM($1)`;
    const debugResult = await client.query(debugQuery, [bookingId.trim()]);
    console.log("Debug Matching Ticket Record After Update:", debugResult.rows);

    // Commit transaction if both updates succeed
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
      message: "Failed to create Razorpay order and update booking and ticket tables",
      error: error.message,
    });
  }
};



// Verify payment
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

    // Check if the booking exists and retrieve the event_id
    const bookingQuery = `
      SELECT booking_id, event_id 
      FROM bookings 
      WHERE booking_id = $1
    `;
    const bookingResult = await client.query(bookingQuery, [razorpay_order_id]);

    if (bookingResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    const { event_id } = bookingResult.rows[0]; // Get event_id from the bookings table

    // Insert payment details with event_id
    const paymentInsertQuery = `
      INSERT INTO payments (
        booking_id, event_id, amount, status, payment_method, transaction_id, payment_gateway
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const paymentResult = await client.query(paymentInsertQuery, [
      razorpay_order_id, // booking_id
      event_id, // event_id
      paymentDetails.amount / 100, // Convert paisa to INR
      paymentDetails.status,
      paymentDetails.method,
      paymentDetails.id, // transaction_id
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
      "confirmed",
      razorpay_order_id,
    ]);

    // Update ticket status
    const ticketUpdateQuery = `
      UPDATE tickets
      SET status = 'confirmed'
      WHERE booking_id = $1
      RETURNING *
    `;
    const ticketUpdate = await client.query(ticketUpdateQuery, [
      razorpay_order_id,
    ]);

    await client.query("COMMIT");

    res.status(200).json({
      success: true,
      message: "Payment verified and booking updated successfully.",
      payment: paymentResult.rows[0],
      booking: bookingUpdate.rows[0],
      tickets: ticketUpdate.rows,
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




