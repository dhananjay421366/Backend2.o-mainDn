
import client from '../config.js';
import QRCode from "qrcode";
import bwipjs from "bwip-js";

// Function to generate tickets with QR codes and barcodes
// export const generateTickets = async (ticketData) => {
//   const { booking_id, event_id, ticket_types, ticket_count, user_id } = ticketData;

//   // Validate inputs
//   if (!booking_id || !event_id || !user_id || !ticket_count) {
//     throw new Error("Missing required data for ticket generation");
//   }

//   console.log('Booking ID:', booking_id);
//   console.log('Event ID:', event_id);
//   console.log('User ID:', user_id);
//   console.log('Ticket Count:', ticket_count);

//   // Fetch event data from the event table
//   const eventQuery = `SELECT * FROM events WHERE event_id = '${event_id}'`;
//   const eventResult = await client.query(eventQuery);

//   if (eventResult.rows.length === 0) {
//     throw new Error("Event not found");
//   }

//   const eventData = eventResult.rows[0];
//   const { name: event_name, venue, date, location, city, state, category, event_poster } = eventData;

//   // Fetch booking data from the bookings table
//   const bookingQuery = `SELECT * FROM bookings WHERE booking_id = '${booking_id}' AND event_id = '${event_id}' AND user_id = '${user_id}'`;
//   const bookingResult = await client.query(bookingQuery);

//   if (bookingResult.rows.length === 0) {
//     throw new Error("Booking not found for this user and event");
//   }

//   const bookingData = bookingResult.rows[0];
//   const { ticket_quantity, ticket_type } = bookingData;
// console.log(ticket_quantity);
//   if (ticket_quantity !== ticket_count) {
//     throw new Error("Ticket quantity does not match the specified count");
//   }

//   // Fetch user data to get the username
//   const userQuery = `SELECT user_name FROM users WHERE user_id = '${user_id}'`;
//   const userResult = await client.query(userQuery);

//   if (userResult.rows.length === 0) {
//     throw new Error("User not found");
//   }

//   const { user_name } = userResult.rows[0];

//   const values = [];
//   const ticketsWithCodes = [];

//   for (let i = 0; i < ticket_count; i++) {
//     const ticketId = generateTicketId();

//     const qrCodeData = {
//       ticket_id: ticketId,
//       booking_id,
//       event_id,
//       event_name,
//       ticket_types,
//       venue,
//       date,
//       location,
//       city,
//       state,
//       category,
//       event_poster,
//       user_name,
//     };

//     const qrCode = await QRCode.toDataURL(JSON.stringify(qrCodeData));

//     const barcode = await new Promise((resolve, reject) => {
//       bwipjs.toBuffer(
//         {
//           bcid: "code128",
//           text: ticketId,
//           scale: 3,
//           height: 10,
//           includetext: true,
//           textxalign: "center",
//         },
//         (err, png) => {
//           if (err) reject(err);
//           resolve("data:image/png;base64," + png.toString("base64"));
//         }
//       );
//     });

//     values.push(
//       `('${ticketId}', '${booking_id}', '${event_id}', '{${ticket_types.map((type) => type).join(',')}}', 'pending', '${qrCode}', '${barcode}', '${event_name}', '${venue}', '${date}', '${location}', '${city}', '${state}', '${category}', '${event_poster}', '${user_name}')`
//     );

//     ticketsWithCodes.push({
//       ticket_id: ticketId,
//       booking_id,
//       event_id,
//       ticket_types,
//       event_name,
//       venue,
//       date,
//       location,
//       city,
//       state,
//       category,
//       event_poster,
//       user_name,
//       qr_code: qrCode,
//       barcode: barcode,
//     });
//   }

//   // const query = `
//   //   INSERT INTO tickets (ticket_id, booking_id, event_id, ticket_type, status, qr_code, barcode, event_name, venue, date, location, city, state, category, event_poster, username) 
//   //   VALUES ${values.join(", ")} 
//   //   RETURNING *`;

//   // console.log("SQL Query:", query); // Log the query for debugging

//   // const result = await client.query(query);

//   return ticketsWithCodes;
// };
// Function to generate tickets with QR codes and barcodes
export const generateTickets = async (ticketData) => {
  const { booking_id, event_id, ticket_types, ticket_count, user_id } = ticketData;

  // Validate inputs
  if (!booking_id || !event_id || !user_id || !ticket_count) {
    throw new Error("Missing required data for ticket generation");
  }

  // Fetch event and booking data in a single query
  const query = `
  SELECT e.event_id AS event_id, e.name AS event_name, e.venue, e.date, e.location, e.city, e.state, e.category, e.event_poster,
         b.ticket_quantity, b.ticket_type,
         u.user_name  -- Fetching user_name from the users table
  FROM events e
  JOIN bookings b ON b.event_id = e.event_id
  JOIN users u ON u.user_id = b.user_id  -- Ensure proper join with users table
  WHERE e.event_id = $1 AND b.booking_id = $2 AND b.user_id = $3;
`;



  const result = await client.query(query, [event_id, booking_id, user_id]);

  if (result.rows.length === 0) {
    throw new Error("Event, booking, or user not found");
  }

  const { event_name, venue, date, location, city, state, category, event_poster, ticket_quantity, ticket_type, user_name } = result.rows[0];

  // Validate ticket count
  if (ticket_quantity !== ticket_count) {
    throw new Error("Ticket quantity does not match the specified count");
  }

  const ticketsWithCodes = [];
  const values = [];

  // Generate QR codes and barcodes in parallel
  const ticketPromises = Array.from({ length: ticket_count }, async (_, i) => {
    const ticketId = generateTicketId();

    const qrCodeData = {
      ticket_id: ticketId,
      booking_id,
      event_id,
      event_name,
      ticket_types,
      venue,
      date,
      location,
      city,
      state,
      category,
      event_poster,
      user_name,
    };

    const qrCodePromise = QRCode.toDataURL(JSON.stringify(qrCodeData));
    const barcodePromise = new Promise((resolve, reject) => {
      bwipjs.toBuffer(
        {
          bcid: "code128",
          text: ticketId,
          scale: 3,
          height: 10,
          includetext: true,
          textxalign: "center",
        },
        (err, png) => {
          if (err) reject(err);
          resolve("data:image/png;base64," + png.toString("base64"));
        }
      );
    });

    // Wait for both QR code and barcode to be generated
    const [qrCode, barcode] = await Promise.all([qrCodePromise, barcodePromise]);

    // Prepare values for insertion into the tickets table
    values.push(
      `('${ticketId}', '${booking_id}', '${event_id}', '{${ticket_types.join(',')}}', 'pending', '${qrCode}', '${barcode}', '${user_name}')`
    );

    // Store ticket info for the response
    ticketsWithCodes.push({
      ticket_id: ticketId,
      booking_id,
      event_id,
      ticket_types,
      event_name,
      venue,
      date,
      location,
      city,
      state,
      category,
      event_poster,
      user_name,
      qr_code: qrCode,
      barcode: barcode,
    });
  });

  // Wait for all tickets to be generated
  await Promise.all(ticketPromises);

  // Insert all tickets in a single query
  const insertQuery = `
    INSERT INTO tickets (ticket_id, booking_id, event_id, ticket_types, status, qr_code, barcode, username)
    VALUES ${values.join(", ")}
    RETURNING *;
  `;
  await client.query(insertQuery);

  // Return tickets with QR codes and barcodes
  return ticketsWithCodes;
};



export const generateTicketId = () => {
  const randomPart = Math.random().toString(36).substring(2, 11).toUpperCase();
  return `ticket_${randomPart}`; // Prefix with "ticket_"
};
