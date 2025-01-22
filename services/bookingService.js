// Import database client configuration
import client from '../config.js';


// Function to create a booking and insert it into the database
export const createBooking = async ({ event_id, user_id, ticket_types }, booking_id) => {
  if (!event_id || !user_id || !ticket_types || ticket_types.length === 0) {
    throw new Error("Missing required booking data.");
  }

  // Calculate total ticket quantity
  const ticket_quantity = ticket_types.reduce((total, { quantity }) => total + quantity, 0);
  console.log(ticket_types);
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
  return bookingResult.rows[0];
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
