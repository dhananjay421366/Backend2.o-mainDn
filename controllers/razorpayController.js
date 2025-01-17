
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
      const {
        amount = 1,
        ticketId = uuidv4(),
        TicketType = "single",
        person = 1,
        Fullname = "Dhananjay",
        Email = "nimbalkar@gmail.com",
        Mobile_No = 7350304620,
        bookingId = "bookIdPR61X60VP", // Existing booking ID
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
  
      if (updatedBooking.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          message: "No booking record found to update.",
        });
      }
  
      // Update the ticket table with the Razorpay order ID
      const updateTicketQuery = `
        UPDATE tickets
        SET booking_id = $1
        WHERE booking_id = $2
        RETURNING *;
      `;
      const updatedTicket = await client.query(updateTicketQuery, [
        order.id, // Razorpay order ID
        bookingId, // Existing booking ID
      ]);
  
      if (updatedTicket.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          message: "No ticket record found to update.",
        });
      }
  
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
  
      // Check if the booking exists
      const bookingExists = await client.query(
        "SELECT booking_id FROM bookings WHERE booking_id = $1",
        [razorpay_order_id] // Use `razorpay_order_id` as `booking_id`
      );
  
      if (bookingExists.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          message: "Invalid booking ID",
        });
      }
  
      // Insert payment details
      const paymentResult = await client.query(
        `INSERT INTO payments (booking_id, amount, status, payment_method, transaction_id, payment_gateway)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          razorpay_order_id, // Set `booking_id` as `razorpay_order_id`
          paymentDetails.amount / 100,
          paymentDetails.status,
          paymentDetails.method,
          paymentDetails.id,
          "razorpay",
        ]
      );
  
      // Update booking status
      const bookingUpdate = await client.query(
        `UPDATE bookings
         SET status = $1, updated_at = CURRENT_TIMESTAMP
         WHERE booking_id = $2
         RETURNING *`,
        ["confirmed", razorpay_order_id]
      );
  
      // Update ticket status
      const ticketUpdate = await client.query(
        `UPDATE tickets
         SET status = 'confirmed'
         WHERE booking_id = $1
         RETURNING *`,
        [razorpay_order_id]
      );
  
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
  