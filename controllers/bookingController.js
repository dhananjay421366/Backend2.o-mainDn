import CryptoJs from "crypto-js";
import { createBooking, getBookingDetails, listUserBookings } from "../services/bookingService.js";
import db from '../config.js';
import { generateBookingId } from "../services/ticketService.js";

// Controller function to handle booking creation
export const create = async (req, res) => {
  try {
    const booking_id = generateBookingId(); // Generate a unique booking ID
    const bookingData = req.body; // Get booking data from the request body

    // Create the booking and get the result
    const booking = await createBooking(bookingData, booking_id);

    // Send success response
    res.status(201).json({
      success: true,
      message: "Booking created successfully.",
      booking,
    });
  } catch (error) {
    // Handle errors
    console.error("Error in create:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};
// Controller function to get details of a specific booking
export const getDetails = async (req, res) => {
  try {
    const id = req.params.id; // Get booking ID from route parameters
    const booking = await getBookingDetails(id); // Retrieve booking details
    res.status(200).json({ booking }); // Respond with booking details
  } catch (error) {
    res.status(400).json({ error: error.message }); // Respond with error message if retrieval fails
  }
};

// Controller function to list all bookings made by a specific user
export const listUserBookings1 = async (req, res) => {
  try {
    const userId = req.params.userId; // Get user ID from route parameters
    const bookings = await listUserBookings(userId); // Retrieve the list of bookings
    res.status(200).json({ bookings }); // Respond with the list of bookings
  } catch (error) {
    res.status(400).json({ error: error.message }); // Respond with error message if retrieval fails
  }
};

// Hardcoded Secret Keys (for demonstration purposes)
const aliceSecretkey = "mahesh";
const bobSecretkey = "mahesh";

// Encrypt Text Function
function encrypttext(data, secretKey) {
  const cipherText = CryptoJs.AES.encrypt(data, secretKey).toString();
  return cipherText;
}

// Encrypt Data Controller
export const encrypt = async (req, res) => {
  try {
    const { organiser_id, Account_name, Account_number, IFSC } = req.body;

    // Validate input data
    if (!organiser_id || !Account_name || !Account_number || !IFSC) {
      return res.status(400).json({ error: "All fields are required." });
    }

    // Encrypting sensitive data
    const encrypt_organiser_id = encrypttext(organiser_id, aliceSecretkey);
    const encrypt_Account_name = encrypttext(Account_name, aliceSecretkey);

    const encrypt_Account_number = encrypttext(Account_number, aliceSecretkey);
    const encrypt_IFSC = encrypttext(IFSC, aliceSecretkey);
    // Insert encrypted data into the database
    await db.query(
      "INSERT INTO bankdetail (organiser_id, Account_name, Account_number, IFSC) VALUES ($1, $2, $3, $4)",
      [encrypt_organiser_id, encrypt_Account_name, encrypt_Account_number, encrypt_IFSC]
    );

    // Respond with the encrypted data
    res.json({
      message: 'Data encrypted and saved successfully.',
      encryptedData: {
        organiser_id: encrypt_organiser_id,
        Account_name: encrypt_Account_name,
        Account_number: encrypt_Account_number,
        IFSC: encrypt_IFSC
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Decrypt Text Function
function decrypttext(cipherText, bobSecretkey) {

  try {
    const bytes = CryptoJs.AES.decrypt(cipherText, bobSecretkey);


    if (bytes > 0) {

      const decryptdata = bytes.toString(CryptoJs.enc.Utf8);

      return decryptdata;
    } else {
      throw new Error("Invalid decryption data.");
    }
  } catch (error) {
    throw new Error("Please enter valid data.");
  }
}

// Decrypt Data Controller
export const decrypt = async (req, res) => {

  const { settlement_id } = req.body
  try {
    const data = await db.query("select * from bankdetail where settlement_id = ($1)", [settlement_id])

    if (!data) {
      return res.status(400).json({ error: "No data provided for decryption." });
    }
    const decryptdata_organiser_id = decrypttext(data.rows[0].organiser_id, bobSecretkey);
    const decryptdata_Account_name = decrypttext(data.rows[0].account_name, bobSecretkey);
    const decryptdata_Account_number = decrypttext(data.rows[0].account_number, bobSecretkey);
    const decryptdata_IFSC = decrypttext(data.rows[0].ifsc, bobSecretkey);
    const decryptdata = { decryptdata_organiser_id, decryptdata_Account_name, decryptdata_Account_number, decryptdata_IFSC }

    res.json({ message: 'Data decrypted successfully.', decryptedData: decryptdata });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const encrypt2 = async (req, res) => {
  const data = req.body

  var ciphertext = CryptoJs.AES.encrypt(JSON.stringify(data), aliceSecretkey).toString();

  await db.query(
    "INSERT INTO settlement (settlement_data) VALUES ($1)",
    [ciphertext]
  );


  res.send(ciphertext);
}

export const dcrypt2 = async (req, res) => {

  const { settlement_id } = req.body
  try {
    const data = await db.query("select * from settlement where settlement_id = ($1)", [settlement_id])

    var bytes = CryptoJs.AES.decrypt(data.rows[0].settlement_data, bobSecretkey);
    var decryptedData = JSON.parse(bytes.toString(CryptoJs.enc.Utf8));

    res.status(200).json(decryptedData)
  } catch (err) {
    res.status(400).json({ error: err });
  }
}


//cancel    booking
export const CancelBooking = async (req, res) => {
  const { booking_id } = req.body;

  if (!booking_id) {
    return res.status(400).json({ error: "Booking ID is required" });
  }

  try {


    try {
      await client.query("BEGIN");

      // Check if the booking exists and is not already canceled
      const bookingQuery = `
        SELECT event_id, ticket_quantity, status 
        FROM bookings 
        WHERE id = $1
      `;
      const bookingResult = await client.query(bookingQuery, [booking_id]);

      if (bookingResult.rows.length === 0) {
        return res.status(404).json({ error: "Booking not found" });
      }

      const { event_id, ticket_quantity, status } = bookingResult.rows[0];

      if (status === "canceled") {
        return res.status(400).json({ error: "Booking is already canceled" });
      }

      // Update booking status to 'canceled'
      const cancelBookingQuery = `
        UPDATE bookings 
        SET status = 'canceled' 
        WHERE id = $1
      `;
      await client.query(cancelBookingQuery, [booking_id]);

      // Restore tickets to the event
      const restoreTicketsQuery = `
        UPDATE events 
        SET available_tickets = available_tickets + $1 
        WHERE id = $2
      `;
      await client.query(restoreTicketsQuery, [ticket_quantity, event_id]);

      // Commit the transaction
      await client.query("COMMIT");

      res.status(200).json({
        message: "Booking canceled successfully",
        bookingId: booking_id,
      });
    } catch (error) {
      await client.query("ROLLBACK");

      res.status(500).json({ error: "An error occurred while canceling the booking" });
    } finally {
      client.release();
    }
  } catch (error) {
    res.status(500).json({ error: "Database connection error" });
  }
};

//funtion to check tickets availability
export const CheckTicket = async (req, res) => {
  const { event_id } = req.body;

  if (!event_id) {
    return res.status(400).json({ error: "Event ID is required" });
  }

  try {
    const query = `SELECT name, tickets FROM events WHERE id = $1`;
    const result = await client.query(query, [event_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    const { name, tickets } = result.rows[0];

    res.status(200).json({
      event: name,
      tickets: tickets.map((ticket) => ({
        type: ticket.type,
        price: ticket.price,
        available_tickets: ticket.available,
      })),
      message: tickets.some((ticket) => ticket.available > 0)
        ? "Tickets are available for this event."
        : "No tickets are available for this event.",
    });
  } catch (error) {

    res.status(500).json({ error: "An error occurred while checking ticket availability" });
  }
};
