import { generateTickets } from '../services/ticketService.js';

import crypto from 'crypto';
import dotenv from 'dotenv';
import client from '../config.js';
import { instance } from "../config2.js";
import { sendBookingConfirmationEmail } from '../services/emailService.js';
import { checkPaymentStatusRazorpay } from "../services/paymentService.js";
dotenv.config();

// // Create an order
export const createOrder = async (req, res) => {
  try {
    // Destructure and provide default values for request body
    let {
      amount = 1,
      TicketType = "single",
      person = 1,
      Fullname = "Dhananjay",
      Email = "nimbalkardhananjay349@gmail.com",
      Mobile_No = 7350304620,
      bookingId = "bookedI4J71SVBA",
    } = req.body;

    // Create Razorpay order options
    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: bookingId,
    };

    // Generate Razorpay order
    const order = await instance.orders.create(options);

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
      order.id,
      bookingId,
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
    res.cookie("Email", Email, { httpOnly: true, secure: true });

    // Render checkout page with updated details
    res.render("checkout", {
      amount: order.amount,
      order_id: order.id,
      Email,
      Mobile_No,
      bookingId: order.id,
    });
  } catch (error) {
    console.error("Error in createOrder:", error);

    // Rollback transaction in case of any error
    await client.query("ROLLBACK");

    // Send error response to the client
    res.status(500).json({
      success: false,
      message: "Failed to create Razorpay order and update booking table",
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
    // Generate signature using Razorpay's secret key
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

    // Fetch payment details
    const paymentDetails = await checkPaymentStatusRazorpay(razorpay_payment_id);

    await client.query("BEGIN");

    // Fetch booking details
    const bookingQuery = `SELECT * FROM bookings WHERE booking_id = $1`;
    const bookingResult = await client.query(bookingQuery, [razorpay_order_id]);

    if (bookingResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "Invalid booking ID" });
    }

    const booking = bookingResult.rows[0];
    const { event_id, ticket_types, user_email, user_name, ticket_quantity, user_id } = booking;

    // Parse ticket types
    let parsedTicketTypes = typeof ticket_types === "string" ? JSON.parse(ticket_types) : ticket_types;

    // Fetch event details including name, venue, date, etc.
    const eventQuery = `SELECT name, venue, date, event_time, available_tickets, tickets FROM events WHERE event_id = $1`;
    const eventResult = await client.query(eventQuery, [event_id]);

    if (eventResult.rows.length === 0) {
      throw new Error("Event not found.");
    }

    const eventDetails = eventResult.rows[0];
    console.log("Event details is :", eventDetails);
    const availableTickets = eventDetails.available_tickets;

    if (ticket_quantity > availableTickets) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: `Insufficient available tickets. Only ${availableTickets} tickets are left.`,
      });
    }

    // Generate tickets for the user
    const tickets = await generateTickets({
      booking_id: razorpay_order_id,
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

    const updateEventQuery = `
      UPDATE events 
      SET available_tickets = $1, tickets = $2, updated_at = CURRENT_TIMESTAMP
      WHERE event_id = $3
      RETURNING available_tickets, tickets;
    `;
    await client.query(updateEventQuery, [
      updatedAvailableTickets,
      JSON.stringify(updatedTickets),
      event_id,
    ]);

    // Insert payment details
    const paymentInsertQuery = `
      INSERT INTO payments (booking_id, event_id, amount, status, payment_method, transaction_id, payment_gateway)
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

    // Update booking status to confirmed
    const bookingUpdateQuery = `
      UPDATE bookings 
      SET status = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE booking_id = $2 
      RETURNING *;
    `;
    const bookingUpdate = await client.query(bookingUpdateQuery, ["confirmed", razorpay_order_id]);

    // Prepare booking details for email
    const formattedTicketTypes = parsedTicketTypes.map(ticket => `${ticket.type} (x${ticket.quantity})`).join(", ");
    const bookingDetails = {
      eventName: eventDetails.name,
      venue: eventDetails.venue,
      eventDate: new Date(eventDetails.date).toLocaleDateString(),
      eventTime: eventDetails.event_time || 'TBD',
      bookingId: booking.booking_id,
      ticketQuantity: ticket_quantity,
      userName: booking.user_name,
      userEmail: booking.user_email,
      userPhone: booking.user_phone || 'Not Provided',
      ticketType: formattedTicketTypes,
      amount: paymentDetails.amount / 100,
      tickets: tickets
    };
    console.log("Booking final data", bookingDetails);

    // Send booking confirmation email
    await sendBookingConfirmationEmail(user_email, bookingDetails);

    // Commit transaction
    await client.query("COMMIT");

    res.status(200).json({
      success: true,
      message: "Payment verified, booking updated, tickets generated, and confirmation email sent successfully.",
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

export const getTransactionHistory = async (req, res) => {
  try {
    const { userId, email } = req.body;

    if (!userId && !email) {
      return res.status(400).json({
        success: false,
        message: "User ID or Email is required to fetch transaction history.",
      });
    }

    // Start SQL query preparation
    let query = `
      SELECT 
        p.transaction_id, p.amount, p.status, p.payment_method, p.payment_gateway, 
        r.refund_id, r.amount AS refund_amount, r.status AS refund_status,
        b.booking_id, b.event_id, b.user_email, b.user_name
      FROM payments p
      LEFT JOIN refunds r ON p.transaction_id = r.transaction_id
      LEFT JOIN bookings b ON p.booking_id = b.booking_id
      WHERE `;

    const queryParams = [];

    if (userId) {
      query += ` b.user_id = $1 `;
      queryParams.push(userId);
    } else if (email) {
      query += ` b.user_email = $1 `;
      queryParams.push(email);
    }

    // Execute the query
    const result = await client.query(query, queryParams);

    // Check if transactions exist
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No transaction history found for the given user.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Transaction history fetched successfully.",
      transactions: result.rows,
    });

  } catch (error) {
    console.error("Error fetching transaction history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch transaction history.",
      error: error.message,
    });
  }
};




