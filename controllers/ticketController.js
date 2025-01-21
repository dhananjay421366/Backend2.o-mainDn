import client from "../config.js"; // Assuming you have a configured PostgreSQL client
import { generateTickets } from '../services/ticketService.js'

// Controller function to handle ticket generation requests
export const generate = async (req, res) => {
  try {
    const ticketData = req.body; // Get ticket data from the request body
    const tickets = await generateTickets(ticketData); // Generate the tickets
    res.status(201).json({ message: 'Tickets generated successfully.', tickets }); // Respond with success message and tickets
  } catch (error) {
    console.error("Error creating ticket:", error);
    res.status(400).json({ error: error.message }); // Respond with error message if generation fails
  }
};
export const scanTicket = async (req, res) => {
  try {
    const { ticket_id, event_id } = req.body; // Ticket ID and Event ID should be sent in the request body

    if (!ticket_id || !event_id) {
      return res.status(400).json({
        success: false,
        message: "Ticket ID and Event ID are required",
      });
    }

    // Start a transaction
    await client.query("BEGIN");

    // Fetch ticket details to ensure it exists and matches the provided event_id
    const ticketQuery = `
      SELECT * 
      FROM tickets 
      WHERE ticket_id = $1 AND event_id = $2
    `;
    const ticketResult = await client.query(ticketQuery, [ticket_id, event_id]);

    if (ticketResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Ticket not found for the specified event",
      });
    }

    const ticket = ticketResult.rows[0];

    if (ticket.check_in_status) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "Ticket has already been checked in",
      });
    }

    // Update check-in status and check-in time
    const updateQuery = `
      UPDATE tickets 
      SET check_in_status = TRUE, 
          check_in_time = CURRENT_TIMESTAMP
      WHERE ticket_id = $1 AND event_id = $2
      RETURNING *;
    `;
    const updateResult = await client.query(updateQuery, [ticket_id, event_id]);

    // Commit the transaction
    await client.query("COMMIT");

    // Respond with the updated ticket details
    return res.status(200).json({
      success: true,
      message: "Ticket checked in successfully",
      ticket: updateResult.rows[0],
    });
  } catch (error) {
    console.error("Error in scanTicket:", error);

    // Rollback the transaction in case of an error
    await client.query("ROLLBACK");

    return res.status(500).json({
      success: false,
      message: error.message || "An error occurred while checking in the ticket",
    });
  }
};
