import client from '../config.js';

export const findOrganizerById = async (id) => {
  try {
    const result = await client.query('SELECT * FROM organizers WHERE id = $1', [id]);
    return result.rows[0]; // Return the organizer if found
  } catch (error) {
    console.error('Error finding organizer:', error.message);
    throw new Error('Database query failed');
  }
};
