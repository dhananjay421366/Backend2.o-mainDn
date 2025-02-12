// Import database client configuration
import client from '../config.js';
import { sendNotificationEmail, sendVerificationEmail } from './emailService.js';


// // // Function to create a booking and insert it into the database
// export const createBooking = async ({ event_id, user_id, ticket_types, user_email, user_name }, booking_id) => {
//   if (!event_id || !user_id || !ticket_types?.length) {
//     throw new Error("Missing required booking data.");
//   }

//   try {
//     // Calculate total ticket quantity
//     const ticket_quantity = ticket_types.reduce((total, { quantity }) => total + quantity, 0);

//     // Fetch event details: available tickets, booking status, and event date
//     const eventQuery = `
//       SELECT name, available_tickets, booking_status_live, date
//       FROM events 
//       WHERE event_id = $1
//     `;
//     const eventResult = await client.query(eventQuery, [event_id]);

//     if (eventResult.rowCount === 0) {
//       throw new Error("Event not found.");
//     }

//     const { name: eventName, available_tickets: availableTickets, booking_status_live, event_date } = eventResult.rows[0];

//     // Check if booking is live
//     if (!booking_status_live) {
//       throw new Error("Ticket booking is currently not live for this event.");
//     }

//     // Check ticket availability (only if available_tickets is not NULL)
//     if (availableTickets !== null && ticket_quantity > availableTickets) {
//       throw new Error(`Insufficient available tickets. Only ${availableTickets} tickets are left.`);
//     }

//     // Insert booking data into the database
//     const insertBookingQuery = `
//       INSERT INTO bookings (booking_id, event_id, user_id, event_date, user_email, user_name, ticket_types, ticket_quantity, status)
//       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
//       RETURNING *;
//     `;

//     const bookingValues = [
//       booking_id,
//       event_id,
//       user_id,
//       event_date,  // Pass event_date here
//       user_email,
//       user_name,
//       JSON.stringify(ticket_types),
//       ticket_quantity,
//       "pending",
//     ];

//     const bookingResult = await client.query(insertBookingQuery, bookingValues);

//     // Send confirmation email
//     const emailSubject = "Booking Confirmation ✔";
//     const emailContent = `
//       Hi ${user_name},

//       Thank you for booking your tickets for ${eventName}!

//       Booking Details:
//       - Booking ID: ${booking_id}
//       - Event: ${eventName}
//       - Tickets: ${ticket_quantity}

//       We look forward to seeing you at the event.

//       Best regards,
//       Event Team
//     `;
//     await sendNotificationEmail(user_email, emailSubject, emailContent);

//     // Return the created booking
//     return bookingResult.rows[0];
//   } catch (error) {
//     console.error("Error in createBooking:", error);
//     throw new Error(error.message || "Internal Server Error");
//   }
// };


// export const createBooking = async ({ event_id, user_id, ticket_types, user_email, user_name }, booking_id) => {
//   if (!event_id || !user_id || !ticket_types?.length) {
//     throw new Error("Missing required booking data.");
//   }

//   try {
//     // Fetch event details including ticket data
//     const eventQuery = `
//       SELECT name, available_tickets, booking_status_live, date, tickets
//       FROM events 
//       WHERE event_id = $1
//     `;
//     const eventResult = await client.query(eventQuery, [event_id]);

//     if (eventResult.rowCount === 0) {
//       throw new Error("Event not found.");
//     }

//     const { 
//       name: eventName, 
//       available_tickets: globalAvailableTickets, 
//       booking_status_live, 
//       event_date, 
//       tickets // Fetch the tickets field
//     } = eventResult.rows[0];

//     // Check if booking is live
//     if (!booking_status_live) {
//       throw new Error("Ticket booking is currently not live for this event.");
//     }

//     // ✅ Ensure tickets is a valid object
//     const eventTickets = typeof tickets === "string" ? JSON.parse(tickets) : tickets;

//     if (!Array.isArray(eventTickets)) {
//       throw new Error("Invalid ticket format in database.");
//     }

//     // Calculate total amount and ticket quantity
//     let totalAmount = 0;
//     let totalBookedTickets = 0;

//     for (const { type, quantity } of ticket_types) {
//       // Find the corresponding ticket type in the event's tickets
//       const ticketDetails = eventTickets.find(ticket => ticket.type === type);

//       if (!ticketDetails) {
//         throw new Error(`Invalid ticket type: ${type}.`);
//       }

//       const { amount, available_tickets } = ticketDetails;

//       if (quantity > available_tickets) {
//         throw new Error(`Not enough "${type}" tickets available. Only ${available_tickets} left.`);
//       }

//       totalAmount += amount * quantity;
//       totalBookedTickets += quantity;
//     }

//     // Check overall event ticket availability (if limited)
//     if (globalAvailableTickets !== null && totalBookedTickets > globalAvailableTickets) {
//       throw new Error(`Insufficient event tickets. Only ${globalAvailableTickets} tickets are left.`);
//     }

//     // Insert booking data into the database
//     const insertBookingQuery = `
//       INSERT INTO bookings (booking_id, event_id, user_id, event_date, user_email, user_name, ticket_types, ticket_quantity, status, total_amount)
//       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
//       RETURNING *;
//     `;

//     const bookingValues = [
//       booking_id,
//       event_id,
//       user_id,
//       event_date,
//       user_email,
//       user_name,
//       JSON.stringify(ticket_types),
//       totalBookedTickets,
//       "pending",
//       totalAmount, // Store the calculated total amount
//     ];

//     const bookingResult = await client.query(insertBookingQuery, bookingValues);

//     // Send confirmation email
//     const emailSubject = "Booking Confirmation ✔";
//     const emailContent = `
//       Hi ${user_name},

//       Thank you for booking your tickets for ${eventName}!

//       Booking Details:
//       - Booking ID: ${booking_id}
//       - Event: ${eventName}
//       - Tickets: ${totalBookedTickets}
//       - Total Amount Paid: ₹${totalAmount}

//       We look forward to seeing you at the event.

//       Best regards,  
//       Event Team
//     `;
//     await sendNotificationEmail(user_email, emailSubject, emailContent);

//     return bookingResult.rows[0]; // Return the created booking
//   } catch (error) {
//     console.error("Error in createBooking:", error);
//     throw new Error(error.message || "Internal Server Error");
//   }
// };

import QRCode from "qrcode";
import bwipjs from "bwip-js"; // For barcode generation

export const createBooking = async ({ event_id, user_id, ticket_types, user_email, user_name }, booking_id) => {
  if (!event_id || !user_id || !ticket_types?.length) {
    throw new Error("Missing required booking data.");
  }

  try {
    // Fetch event details including organizer_id
    const eventQuery = `
      SELECT name, available_tickets, booking_status_live, date, tickets, organizer_id
      FROM events 
      WHERE event_id = $1
    `;
    const eventResult = await client.query(eventQuery, [event_id]);

    if (eventResult.rowCount === 0) {
      throw new Error("Event not found.");
    }

    const { 
      name: eventName, 
      available_tickets: globalAvailableTickets, 
      booking_status_live, 
      event_date, 
      tickets,
      organizer_id // ✅ Get organizer_id directly
    } = eventResult.rows[0];
    console.log(organizer_id);

    if (!booking_status_live) {
      throw new Error("Ticket booking is currently not live for this event.");
    }

    const eventTickets = typeof tickets === "string" ? JSON.parse(tickets) : tickets;
    if (!Array.isArray(eventTickets)) {
      throw new Error("Invalid ticket format in database.");
    }

    let totalBookedTickets = 0;
    let ticketIds = [];

    for (const { type, quantity } of ticket_types) {
      const ticketDetails = eventTickets.find(ticket => ticket.type === type);

      if (!ticketDetails) {
        throw new Error(`Invalid ticket type: ${type}.`);
      }

      const { ticket_id, available_tickets } = ticketDetails;

      if (quantity > available_tickets) {
        throw new Error(`Not enough "${type}" tickets available. Only ${available_tickets} left.`);
      }

      totalBookedTickets += quantity;
      ticketIds.push(ticket_id);
    }

    if (globalAvailableTickets !== null && totalBookedTickets > globalAvailableTickets) {
      throw new Error(`Insufficient event tickets. Only ${globalAvailableTickets} tickets are left.`);
    }

    // ✅ Generate QR Code (Base64 Image) using organizer_id, event_id, and ticket_ids
    const qrCodeData = await QRCode.toDataURL(`Organizer: ${organizer_id}, Event: ${event_id}, Tickets: ${ticketIds.join(",")}`);
    
    // ✅ Generate Barcode (Base64 Image) using event_id and ticket_id
    const barcodeData = await new Promise((resolve, reject) => {
      bwipjs.toBuffer({
        bcid: "code128", // Barcode type
        text: `${event_id}-${ticketIds.join("-")}`, // Format: eventID-ticketID1-ticketID2
        scale: 3,
        height: 10,
        includetext: true
      }, (err, buffer) => {
        if (err) {
          reject(err);
        } else {
          resolve(`data:image/png;base64,${buffer.toString("base64")}`);
        }
      });
    });

    // Insert booking data into the database
    const insertBookingQuery = `
      INSERT INTO bookings (booking_id, event_id, user_id, event_date, user_email, user_name, ticket_types, ticket_quantity, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;

    const bookingValues = [
      booking_id,
      event_id,
      user_id,
      event_date,
      user_email,
      user_name,
      JSON.stringify(ticket_types),
      totalBookedTickets,
      "pending"
    ];

    const bookingResult = await client.query(insertBookingQuery, bookingValues);

    return bookingResult.rows[0]; // Return the created booking
  } catch (error) {
    console.error("Error in createBooking:", error);
    throw new Error(error.message || "Internal Server Error");
  }
};






// Toggle booking status
export const toggleBookingStatus = async (req, res) => {
  const { event_id } = req.params;
  const { booking_status_live } = req.body; // true or false

  if (typeof booking_status_live !== "boolean") {
    return res.status(400).json({
      success: false,
      message: "Invalid booking status. Please provide a boolean value.",
    });
  }

  try {
    // Update booking status for the event
    const updateQuery = `
      UPDATE events 
      SET booking_status_live = $1 
      WHERE event_id = $2
      RETURNING *;
    `;

    const result = await client.query(updateQuery, [booking_status_live, event_id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Event not found.",
      });
    }

    const updatedEvent = result.rows[0];

    return res.status(200).json({
      success: true,
      message: `Booking status updated successfully.`,
      event: updatedEvent,
    });
  } catch (error) {
    console.error("Error in toggleBookingStatus:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error.",
    });
  }
};

export const getBookingDetails = async (booking_id) => {
  // Fetch booking details by booking ID
  const result = await client.query('SELECT * FROM bookings WHERE booking_id = $1', [booking_id]);

  // If booking is not found, throw an error
  if (result.rows.length === 0) {
    throw new Error('Booking not found');
  }

  return result.rows[0]; // Return the booking details
};

// Service function to list all bookings made by a specific user
export const listUserBookings = async (userId) => {
  // Fetch all bookings for the user by user ID
  const result = await client.query('SELECT * FROM bookings WHERE user_id = $1', [userId]);
  return result.rows; // Return the list of bookings
};

export const generateBooking_Id = () => {
  const randomPart = Math.random().toString(36).substring(2, 11).toUpperCase();
  return `bookId${randomPart}`; // Prefix with "ticket_"
};
