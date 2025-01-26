import { generateTickets } from '../services/ticketService.js';

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
    // Destructure and provide default values for request body
    let {
      amount = 1, // Default amount if not provided
      TicketType = "single", // Default ticket type
      person = 1, // Default person count
      Fullname = "Dhananjay", // Default full name
      Email = "nimbalkar@gmail.com", // Default email
      Mobile_No = 7350304620, // Default mobile number
      bookingId = "booked6X4XKK1SP", // Existing booking ID
    } = req.body;

    // Create Razorpay order options
    const options = {
      amount: amount * 100, // Convert amount to paisa as required by Razorpay
      currency: "INR", // Specify currency
      receipt: bookingId, // Use booking ID as receipt ID
    };

    // Generate Razorpay order
    const order = await instance.orders.create(options);

    // Debug log: Razorpay order ID
    console.log("Razorpay Order ID:", order.id);

    // Begin database transaction
    await client.query("BEGIN");

    // SQL query to update booking record with new Razorpay order ID
    const updateBookingQuery = `
      UPDATE bookings
      SET booking_id = $1, updated_at = CURRENT_TIMESTAMP
      WHERE booking_id = $2
      RETURNING *;
    `;
    
    // Execute query to update booking table
    const updatedBooking = await client.query(updateBookingQuery, [
      order.id, // New Razorpay order ID
      bookingId, // Existing booking ID to update
    ]);

    // Check if booking record exists to update
    if (updatedBooking.rowCount === 0) {
      // Rollback transaction if no record is found
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "No booking record found to update.",
      });
    }

    // Commit transaction after successful update
    await client.query("COMMIT");

    // Set updated booking ID as a secure HTTP-only cookie
    res.cookie("bookingId", order.id, { httpOnly: true, secure: true });

    // Render checkout page with updated details
    res.render("checkout", {
      amount: order.amount, // Total amount in paisa
      order_id: order.id, // Razorpay order ID
      Email, // Customer email
      Mobile_No, // Customer mobile number
      bookingId: order.id, // Updated booking ID
    });
  } catch (error) {
    console.error("Error in createOrder:", error);

    // Rollback transaction in case of any error
    await client.query("ROLLBACK");

    // Send error response to the client
    res.status(500).json({
      success: false,
      message: "Failed to create Razorpay order and update booking table",
      error: error.message, // Include error message for debugging
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

    let parsedTicketTypes;
    try {
      parsedTicketTypes = typeof ticket_types === "string" ? JSON.parse(ticket_types) : ticket_types;
    } catch (error) {
      throw new Error("Invalid ticket_types format. Expected valid JSON.");
    }

    // Fetch event details to check available tickets
    const eventQuery = `SELECT available_tickets FROM events WHERE event_id = $1`;
    const eventResult = await client.query(eventQuery, [event_id]);

    if (eventResult.rows.length === 0) {
      throw new Error("Event not found.");
    }

    const availableTickets = eventResult.rows[0].available_tickets;

    if (availableTickets !== null && booking.ticket_quantity > availableTickets) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: `Insufficient available tickets. Only ${availableTickets} tickets are left.`,
      });
    }

    const paymentInsertQuery = `
      INSERT INTO payments (
        booking_id, event_id, amount, status, payment_method, transaction_id, payment_gateway
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
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

    const bookingUpdateQuery = `
      UPDATE bookings
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE booking_id = $2
      RETURNING *;
    `;
    const bookingUpdate = await client.query(bookingUpdateQuery, [
      "confirmed",
      razorpay_order_id,
    ]);

    const ticket_count = bookingUpdate.rows[0].ticket_quantity;

    const tickets = await generateTickets({
      booking_id,
      event_id,
      ticket_types: parsedTicketTypes,
      ticket_count,
      user_id,
    });

    const updateEventTicketsQuery = `
      UPDATE events
      SET 
        available_tickets = available_tickets - $1,
        tickets = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE event_id = $3
      RETURNING available_tickets, tickets;
    `;

    const eventQueryResult = await client.query(`SELECT tickets FROM events WHERE event_id = $1`, [event_id]);
    const currentTicketsData = eventQueryResult.rows[0].tickets || [];
    const updatedTickets = currentTicketsData.map(ticketType => {
      const purchasedTicket = parsedTicketTypes.find(pt => pt.type === ticketType.type);
      if (purchasedTicket) {
        ticketType.available_tickets -= purchasedTicket.quantity;
      }
      return ticketType;
    });

    const eventUpdateResult = await client.query(updateEventTicketsQuery, [
      ticket_count,
      JSON.stringify(updatedTickets),
      event_id,
    ]);

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
// Process refund
export const processRefund = async (req, res) => {
  try {
    // Extract payment details from the request body
    const { paymentId, refundAmount } = req.body;

    // Validate that both payment ID and refund amount are provided
    if (!paymentId || !refundAmount) {
      return res.status(400).json({
        success: false,
        message: "Payment ID and refund amount are required.",
      });
    }

    // Prepare options for the refund request
    const refundOptions = {
      amount: refundAmount * 100, // Convert amount from INR to paise as required by Razorpay
      speed: "normal", // Set refund speed to "normal"
      notes: {
        notes_key_1: "Beam me up Scotty.", // Example note for additional context
        notes_key_2: "Engage", // Another example note
      },
      receipt: `Receipt_${Date.now()}`, // Unique identifier for the refund receipt
    };

    // Initiate the refund process using Razorpay's API
    const refund = await instance.payments.refund(paymentId, refundOptions);

    // Log refund details for debugging
    console.log("Refund successful:", refund);

    // Insert refund details into the refunds table in the database
    const refundRecordQuery = `
      INSERT INTO refunds (transaction_id, refund_id, amount, status)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const refundRecord = await client.query(refundRecordQuery, [
      refund.payment_id,       // Original payment ID for the refund
      refund.id,               // Unique refund ID generated by Razorpay
      refund.amount / 100,     // Convert amount back to INR for database storage
      refund.status,           // Status of the refund (e.g., "processed")
    ]);

    // Log the inserted refund record for reference
    console.log("Refund record inserted into database:", refundRecord.rows[0]);

    // Respond to the client with success and refund details
    return res.status(200).json({
      success: true,
      message: "Refund processed and logged successfully.",
      refund: refund, // Razorpay refund details
      refundRecord: refundRecord.rows[0], // Database record of the refund
    });
  } catch (error) {
    // Log error details for debugging
    console.error("Refund API Error Details:", error.response ? error.response.data : error);

    // Respond to the client with an error message
    return res.status(500).json({
      success: false,
      message: "Failed to process refund.",
      error: error.response ? error.response.data : error.message, // Include Razorpay's error response if available
    });
  }
};



