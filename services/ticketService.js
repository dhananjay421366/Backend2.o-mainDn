import client from '../config.js';

export const generateTickets = async (ticketData) => {
  const { booking_id, event_id, ticket_type, ticket_count } = ticketData;

  if (ticket_count <= 0) {
    throw new Error('Invalid ticket count');
  }

  // Generate values for batch insert
  const values = [];
  for (let i = 0; i < ticket_count; i++) {
    values.push(`(${booking_id}, ${event_id}, '${ticket_type}')`);
  }

  // Insert tickets in bulk
  const query = `
    INSERT INTO tickets (booking_id, event_id, ticket_type) 
    VALUES ${values.join(', ')} 
    RETURNING *`;
  const result = await client.query(query);

  return result.rows; // Return all generated tickets
};
export const generateTicketId = () => {
  const randomPart = Math.random().toString(36).substring(2, 11).toUpperCase(); // Generate 9 random alphanumeric characters
  return `order_${randomPart}`; // Prefix with "order_"
};

