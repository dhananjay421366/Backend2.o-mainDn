// Import database client configuration
import client from '../config.js';

export const createBooking = async (bookingData) => {
  const { event_id, ticket_quantity, user_id, ticket_types } = bookingData; // ticket_types is an array

  const booking_Id = generateBooking_Id();

  if (ticket_quantity <= 0) {
    throw new Error('Invalid ticket quantity');
  }

  try {
    // Begin transaction
    await client.query('BEGIN');

    // Lock the event record to prevent race conditions
    const event = await client.query('SELECT * FROM events WHERE event_id = $1 FOR UPDATE', [event_id]);

    // Check if the event exists and has enough tickets
    if (event.rows.length === 0) {
      throw new Error('Event not found');
    }
    if (event.rows[0].available_tickets < ticket_quantity) {
      throw new Error('Insufficient tickets available');
    }

    // Deduct tickets from the event
    await client.query(
      'UPDATE events SET available_tickets = available_tickets - $1 WHERE event_id = $2',
      [ticket_quantity, event_id]
    );

    // Create the booking with multiple ticket types
    const booking = await client.query(
      'INSERT INTO bookings (booking_Id,event_id, user_id, ticket_quantity, ticket_type) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [booking_Id, event_id, user_id, ticket_quantity, ticket_types]
    );

    // Commit transaction
    await client.query('COMMIT');

    return booking.rows[0]; // Return the created booking
  } catch (error) {
    // Rollback transaction in case of an error
    await client.query('ROLLBACK');
    throw error;
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
