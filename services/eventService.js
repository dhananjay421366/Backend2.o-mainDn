// Import database client configuration
import client from '../config.js';

// Service function to create an event in the database
export const createEvent = async (organizerId, eventData, finalEventPoster) => {
  console.log(eventData);

  const {
    name,
    description,
    type,
    date,
    start_time,
    end_time,
    state,
    city,
    venue,
    available_tickets,
    category,
    tickets
  } = eventData;


  // Insert event data into the `events` table and return the created event
  const result = await client.query(
    `INSERT INTO events 
      (organizer_id, name, description, type, date, start_time, end_time, state, city, venue, available_tickets, category,event_poster, tickets) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,$14) 
      RETURNING *`,
    [
      organizerId,
      name,
      description,
      type,
      date,
      start_time,
      end_time,
      state,
      city,
      venue,
      available_tickets,
      category,
      finalEventPoster,
      JSON.stringify(tickets)
    ]
  );
  return result.rows[0]; // Return the created event
};

export const list_of_all_events = async () => {
  const result = await client.query('SELECT * FROM events ');
  return result.rows; // Return the list of events
}

// Service function to list events from the database with filters and pagination
export const listEvents = async (filters) => {
  // const offset = (page - 1) * limit; // Calculate the offset for pagination
  const query = 'SELECT * FROM events WHERE location = $1 ';
  // Query events with the specified location and pagination
  const result = await client.query(query, [filters.place]);
  return result.rows; // Return the list of events
};


// Service function to get details of a specific event by its ID
export const getEventDetails = async (event_id) => {
  // Query event details from the events table
  const result = await client.query('SELECT * FROM events WHERE event_id = $1', [event_id]);
  if (result.rows.length === 0) {
    throw new Error('Event not found'); // Throw error if event is not found
  }
  return result.rows[0]; // Return the event details
};

// update events 
export const updateEvent = async (eventId, organizerId, eventData, finalEventPoster) => {
  const {
    name,
    description,
    type,
    date,
    start_time,
    end_time,
    state,
    city,
    venue,
    available_tickets,
    category,
    tickets
  } = eventData;

  // Update the event data in the `events` table
  const result = await client.query(
    `UPDATE events
      SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        type = COALESCE($3, type),
        date = COALESCE($4, date),
        start_time = COALESCE($5, start_time),
        end_time = COALESCE($6, end_time),
        state = COALESCE($7, state),
        city = COALESCE($8, city),
        venue = COALESCE($9, venue),
        available_tickets = COALESCE($10, available_tickets),
        category = COALESCE($11, category),
        event_poster = COALESCE($12, event_poster),
        tickets = COALESCE($13, tickets::jsonb)
      WHERE event_id = $14 AND organizer_id = $15
      RETURNING *`,
    [
      name,
      description,
      type,
      date,
      start_time,
      end_time,
      state,
      city,
      venue,
      available_tickets,
      category,
      finalEventPoster,
      tickets ? JSON.stringify(tickets) : null,
      eventId,
      organizerId
    ]
  );

  return result.rows[0]; // Return the updated event
};

export const findEventById = async (eventId) => {
  try {
    const result = await client.query(
      `SELECT * FROM events WHERE event_id = $1`,
      [eventId]
    );

    // Return the event if found, otherwise null
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error finding event by ID:', error.message);
    throw new Error('Unable to find event.');
  }
};


