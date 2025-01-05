import {generateTickets} from '../services/ticketService.js'

// Controller function to handle ticket generation requests
export const generate = async (req, res) => {
  try {
    const ticketData = req.body; // Get ticket data from the request body
    const tickets = await generateTickets(ticketData); // Generate the tickets
    res.status(201).json({ message: 'Tickets generated successfully.', tickets }); // Respond with success message and generated tickets
  } catch (error) {
    res.status(400).json({ error: error.message }); // Respond with error message if generation fails
  }
};
