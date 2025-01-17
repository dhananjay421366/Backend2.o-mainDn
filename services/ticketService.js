
import client from '../config.js';
export const generateTickets = async (ticketData) => {
  const { booking_id, event_id, ticket_types, ticket_count } = ticketData;

  if (ticket_count <= 0) {
    throw new Error("Invalid ticket count");
  }

  if (!Array.isArray(ticket_types)) {
    throw new Error("ticket_types must be an array");
  }

  // Generate unique tickets with unique ticket IDs
  const values = [];
  for (let i = 0; i < ticket_count; i++) {
    const ticketId = generateTicketId(); // Generate unique ticket ID
    values.push(
      `('${ticketId}', '${booking_id}', '${event_id}', '{${ticket_types
        .map((type) => type)
        .join(',')}}', 'pending')`
    ); // Ensure booking_id and event_id are strings
  }

  const query = `
    INSERT INTO tickets (ticket_id, booking_id, event_id, ticket_type, status) 
    VALUES ${values.join(", ")} 
    RETURNING *`;

  const result = await client.query(query);
  return result.rows;
};

export const generateTicketId = () => {
  const randomPart = Math.random().toString(36).substring(2, 11).toUpperCase();
  return `ticket_${randomPart}`; // Prefix with "ticket_"
};
