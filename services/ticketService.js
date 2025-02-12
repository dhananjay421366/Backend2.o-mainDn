
import client from '../config.js';
import QRCode from "qrcode";
import bwipjs from "bwip-js";

// Function to generate tickets with QR codes and barcodes
export const generateTickets = async ({ booking_id, event_id, ticket_types, ticket_count, user_id }) => {


  // Validate required fields
  if (!booking_id || !event_id || !user_id || !ticket_count || !ticket_types || !ticket_types.length) {
    throw new Error("Missing required data for ticket generation");
  }

  // Query to fetch event, booking, and user data
  const query = `
    SELECT e.event_id AS event_id, e.name AS event_name, e.venue, e.date, e.location, e.city, e.state, e.category, e.event_poster,
           b.ticket_quantity, u.user_name
    FROM events e
    JOIN bookings b ON b.event_id = e.event_id
    JOIN users u ON u.user_id = b.user_id
    WHERE e.event_id = $1 AND b.booking_id = $2 AND b.user_id = $3;
  `;

  // Execute query
  const result = await client.query(query, [event_id, booking_id, user_id]);

  // If no result found, throw an error
  if (result.rows.length === 0) {
    throw new Error("Event, booking, or user not found");
  }

  // Destructure event and user data from the result
  const { event_name, venue, date, location, city, state, category, event_poster, user_name } = result.rows[0];


  const ticketsWithCodes = [];
  const values = [];
  const placeholders = [];
  let placeholderIndex = 1;

  // Check if ticket_types is already an object, otherwise parse it
  const parsedTicketTypes = ticket_types.map(ticketType => {
    // Check if it's a string or already an object
    return typeof ticketType === 'string' ? JSON.parse(ticketType) : ticketType;
  });

  console.log("Parsed ticket types:", parsedTicketTypes);

  // Iterate over each ticket type (VIP or General)
  for (const ticketType of parsedTicketTypes) {
    const { type, quantity } = ticketType;

    // Validate quantity
    if (typeof quantity !== 'number' || quantity <= 0 || isNaN(quantity)) {
      throw new Error(`Invalid quantity for ticket type: ${type}. Quantity must be a positive number.`);
    }

    // Generate tickets for each ticket type
    for (let i = 0; i < quantity; i++) {
      const ticketId = generateTicketId();

      // // Prepare data for QR code and barcode
      // const qrCodeData = {
      //   ticket_id: ticketId,
      //   booking_id,
      //   event_id,
      // };

      // // Generate QR code and barcode asynchronously
      // const qrCodePromise = QRCode.toDataURL(JSON.stringify(qrCodeData));
      // const barcodePromise = new Promise((resolve, reject) => {
      //   bwipjs.toBuffer(
      //     {
      //       bcid: 'code128',
      //       text: ticketId && event_id,
      //       scale: 3,
      //       height: 10,
      //       includetext: true,
      //       textxalign: 'center',
      //     },
      //     (err, png) => {
      //       if (err) reject(err);
      //       resolve('data:image/png;base64,' + png.toString('base64'));
      //     }
      //   );
      // });
      // Prepare data for QR code and barcode
      const qrCodeData = {
        ticket_id: ticketId,
        booking_id,
        event_id,
      };

      // Generate QR code and barcode asynchronously
      const qrCodePromise = QRCode.toDataURL(JSON.stringify(qrCodeData));

      const barcodePromise = new Promise((resolve, reject) => {
        const barcodeText = `${ticketId}-${event_id}`;  // Ensure text is a string

        bwipjs.toBuffer(
          {
            bcid: 'code128',
            text: barcodeText,
            scale: 3,
            height: 10,
            includetext: true,
            textxalign: 'center',
          },
          (err, png) => {
            if (err) reject(err);
            resolve('data:image/png;base64,' + png.toString('base64'));
          }
        );
      });



      // Wait for both QR code and barcode to be generated
      const [qrCode, barcode] = await Promise.all([qrCodePromise, barcodePromise]);

      // Prepare the ticket data for insertion
      values.push(ticketId, booking_id, event_id, JSON.stringify(ticketType), "confirm", qrCode, barcode, user_name); // Store ticketType as JSON string
      placeholders.push(
        `($${placeholderIndex++}, $${placeholderIndex++}, $${placeholderIndex++}, $${placeholderIndex++}, $${placeholderIndex++}, $${placeholderIndex++}, $${placeholderIndex++}, $${placeholderIndex++})`
      );

      // Store the generated ticket info
      ticketsWithCodes.push({
        ticket_id: ticketId,
        booking_id,
        event_id,
        ticket_type: type,
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
    }
  }

  // If no tickets were generated, throw an error
  if (placeholders.length === 0) {
    throw new Error("No tickets to insert");
  }

  // SQL query to insert generated tickets into the database
  const insertQuery = `
    INSERT INTO tickets (ticket_id, booking_id, event_id, ticket_types, status, qr_code, barcode, username)
    VALUES ${placeholders.join(", ")}
    RETURNING *;
  `;

  // Execute the insertion query
  const insertResult = await client.query(insertQuery, values);
  return insertResult.rows; // Return the generated tickets
};










export const generateTicketId = () => {
  const randomPart = Math.random().toString(36).substring(2, 11).toUpperCase();
  return `ticket_${randomPart}`; // Prefix with "ticket_"
};
export const generateBookingId = () => {
  const randomPart = Math.random().toString(36).substring(2, 11).toUpperCase();
  return `booked${randomPart}`; // Prefix with "ticket_"
};
