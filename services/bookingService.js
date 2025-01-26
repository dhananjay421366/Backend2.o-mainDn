// Import database client configuration
import client from '../config.js';


// Function to create a booking and insert it into the database
export const createBooking = async ({ event_id, user_id, ticket_types }, booking_id) => {
  if (!event_id || !user_id || !ticket_types?.length) {
    throw new Error("Missing required booking data.");
  }

  try {
    // Calculate total ticket quantity
    const ticket_quantity = ticket_types.reduce((total, { quantity }) => total + quantity, 0);

    // Fetch event details: available tickets and booking status
    const eventQuery = `
      SELECT available_tickets, booking_status_live 
      FROM events 
      WHERE event_id = $1
    `;
    const eventResult = await client.query(eventQuery, [event_id]);

    if (eventResult.rowCount === 0) {
      throw new Error("Event not found.");
    }

    const { available_tickets: availableTickets, booking_status_live } = eventResult.rows[0];

    // Check if booking is live
    if (!booking_status_live) {
      throw new Error("Ticket booking is currently not live for this event.");
    }

    // Check ticket availability (only if available_tickets is not NULL)
    if (availableTickets !== null && ticket_quantity > availableTickets) {
      throw new Error(`Insufficient available tickets. Only ${availableTickets} tickets are left.`);
    }

    // Insert booking data into the database
    const insertBookingQuery = `
      INSERT INTO bookings (booking_id, event_id, user_id, ticket_types, ticket_quantity, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    const bookingValues = [
      booking_id,
      event_id,
      user_id,
      ticket_types,
      ticket_quantity,
      "pending",
    ];

    const bookingResult = await client.query(insertBookingQuery, bookingValues);

    // Return the created booking
    return bookingResult.rows[0];
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
