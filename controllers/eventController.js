// Import necessary functions from the eventService module
import dotenv from 'dotenv';
import client from '../config.js';
import { createEvent, findEventById, getEventDetails, list_of_all_events, listEvents, updateEvent } from '../services/eventService.js';
import { findOrganizerById } from '../services/organizerServicre.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
dotenv.config();
export const create = async (req, res) => {
  try {
    const organizerId = req.user?.organizer_id; // Organizer ID from the authenticated user
    console.log('Organizer ID:', organizerId);

    // Check if the authenticated user exists in the organizers table
    const organizer = await findOrganizerById(organizerId);
    if (!organizer) {
      return res.status(403).json({ message: 'Forbidden. Only organizers can create events.' });
    }

    const eventData = req.body; // Event data from the request body
    console.log('Event Data:', eventData);

    // Check if at least one ticket type is provided
    const tickets = JSON.parse(eventData.tickets); // Parse the tickets string to an array
    if (!tickets || tickets.length === 0) {
      return res.status(400).json({ message: "At least one ticket type is required." });
    }

    // Check if an event poster is uploaded
    const event_poster = req.files?.event_poster?.[0];
    if (!event_poster) {
      return res.status(400).json({ message: 'Event poster image is required.' });
    }

    const localFilePath = event_poster.path; // File path from multer
    console.log('Local File Path:', localFilePath);

    // Upload the image to Cloudinary
    const uploadedImage = await uploadOnCloudinary(localFilePath);
    if (!uploadedImage || !uploadedImage.url) {
      return res.status(500).json({ message: 'Failed to upload event poster to Cloudinary.' });
    }

    const finalEventPoster = uploadedImage.url;
    console.log('Uploaded Image URL:', finalEventPoster);

    // Create the event in the database
    const event = await createEvent(organizerId, eventData, finalEventPoster, tickets);
    console.log('Event Created:', event);

    // Respond with success message and created event data
    res.status(201).json({ message: 'Event created successfully.', event });
  } catch (error) {
    console.error('Error creating event:', error.message);
    res.status(500).json({ error: error.message || 'An error occurred while creating the event.' });
  }
};
export const listofallevents = async (req, res) => {
  try {
    const events = await list_of_all_events(); // Retrieve events based on filters, pagination
    res.status(200).json({ events }); // Respond with the list of events
  } catch (error) {
    res.status(400).json({ error: error.message }); // Respond with error message if listing fails
  }
};


// Controller function to list all events with optional filters and pagination
export const list = async (req, res) => {
  try {
    const filters = req.query; // Get filters from query parameters
    //const page = parseInt(req.query.page) || 1; // Get page number, default to 1
    //const limit = parseInt(req.query.limit) || 1; // Get limit of items per page, default to 10
    const events = await listEvents(filters); // Retrieve events based on filters, pagination
    res.status(200).json({ events }); // Respond with the list of events
  } catch (error) {
    res.status(400).json({ error: error.message }); // Respond with error message if listing fails
  }
};

// Controller function to get the details of a specific event by its ID
export const getDetails = async (req, res) => {
  try {
    const id = req.params.id; // Get event ID from route parameters
    const event = await getEventDetails(id); // Retrieve event details
    res.status(200).json({ event }); // Respond with event details
  } catch (error) {
    res.status(400).json({ error: error.message }); // Respond with error message if retrieval fails
  }
};

// getOrganizer Events by Organizer Id
export const findEventsByOrganizerId = async (req, res) => {
  const { organizerId } = req.body;
  if (!organizerId) {
    throw new Error("Organizer ID is required");
  }

  const query = 'SELECT * FROM events WHERE organizer_id = $1';
  const values = [organizerId];

  const result = await client.query(query, values);

  return {
    message: "Events retrieved successfully",
    events: result.rows, // List of events
  };
};

// Publish Event
export const publishEvent = async (req, res) => {
  const { id } = req.body; // Event ID from the URL // for   get   form   body 

  try {
    // Check if the event exists
    const eventResult = await client.query('SELECT * FROM events WHERE id = $1', [id]);
    if (eventResult.rowCount === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const event = eventResult.rows[0];
    if (event.published) {
      return res.status(400).json({ message: 'Event is already published' });
    }

    // Publish the event
    await client.query('UPDATE events SET published = true WHERE id = $1', [id]);
    res.status(200).json({ message: 'Event published successfully' });
  } catch (error) {
    console.error('Error publishing event:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


export const unpublishEvent = async (req, res) => {
  const { id } = req.body; // Event ID from the URL //  for   now    get  id   from  body 

  try {
    // Check if the event exists
    const eventResult = await client.query('SELECT * FROM events WHERE id = $1', [id]);
    if (eventResult.rowCount === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const event = eventResult.rows[0];
    if (!event.published) {
      return res.status(400).json({ message: 'Event is already unpublished' });
    }

    // Unpublish the event
    await client.query('UPDATE events SET published = false WHERE id = $1', [id]);
    res.status(200).json({ message: 'Event unpublished successfully' });
  } catch (error) {
    console.error('Error unpublishing event:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// update Events 
export const updateEvents = async (req, res) => {
  try {
    const { eventId } = req.params; // Event ID from the request parameters
    const organizerId = req.user?.id; // Organizer ID from the authenticated user

    console.log('Organizer ID:', organizerId, 'Event ID:', eventId);

    // Check if the event exists and belongs to the organizer
    const event = await findEventById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }
    if (event.organizer_id !== organizerId) {
      return res.status(403).json({ message: 'Forbidden. You can only update your own events.' });
    }

    const eventData = req.body; // Updated event data from the request body
    console.log('Updated Event Data:', eventData);

    // Check if an updated event poster is uploaded
    const event_poster = req.files?.event_poster?.[0];
    let finalEventPoster = event.event_poster; // Default to the existing poster URL

    if (event_poster) {
      const localFilePath = event_poster.path; // File path from multer
      console.log('New Local File Path:', localFilePath);

      // Upload the new poster to Cloudinary
      const uploadedImage = await uploadOnCloudinary(localFilePath);
      if (!uploadedImage || !uploadedImage.url) {
        return res.status(500).json({ message: 'Failed to upload updated event poster to Cloudinary.' });
      }

      finalEventPoster = uploadedImage.url;
      console.log('Updated Image URL:', finalEventPoster);
    }

    // Update the event in the database
    const updatedEvent = await updateEvent(eventId, organizerId, eventData, finalEventPoster);
    console.log('Event Updated:', updatedEvent);

    // Respond with success message and updated event data
    res.status(200).json({ message: 'Event updated successfully.', event: updatedEvent });
  } catch (error) {
    console.error('Error updating event:', error.message);
    res.status(500).json({ error: error.message || 'An error occurred while updating the event.' });
  }
};


//like the  event
export const toggleLikeEvent = async (req, res) => {
  const { userId } = req.body; // User ID
  const { eventId } = req.params; // Event ID to toggle like

  try {
    // Check if the event exists
    const eventQuery = 'SELECT * FROM events WHERE id = $1';
    const eventResult = await client.query(eventQuery, [eventId]);

    if (eventResult.rowCount === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    let { user_likes, total_likes } = eventResult.rows[0];

    // If user_likes is null, initialize it as an empty array
    if (!user_likes) {
      user_likes = [];
    }

    // Check if the user has already liked the event
    if (user_likes.includes(userId)) {
      // User has already liked the event, so we toggle it off (unlike)
      const updatedUserLikes = user_likes.filter(id => id !== userId);
      const updatedTotalLikes = updatedUserLikes.length;

      // Update the `user_likes` column in the `events` table
      const updateEventQuery = 'UPDATE events SET user_likes = $1, total_likes = $2 WHERE id = $3';
      await client.query(updateEventQuery, [updatedUserLikes, updatedTotalLikes, eventId]);

      return res.status(200).json({ message: 'Event unliked successfully' });
    } else {
      // User has not liked the event, so we toggle it on (like)
      const updatedUserLikes = [...user_likes, userId];
      const updatedTotalLikes = updatedUserLikes.length;

      // Update the `user_likes` column in the `events` table
      const updateEventQuery = 'UPDATE events SET user_likes = $1, total_likes = $2 WHERE id = $3';
      await client.query(updateEventQuery, [updatedUserLikes, updatedTotalLikes, eventId]);

      return res.status(200).json({ message: 'Event liked successfully' });
    }
  } catch (error) {
    console.error('Error toggling like for event:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};



// Toggle Save Event Function
export const toggleSaveEvent = async (req, res) => {
  try {
    const { user_id, event_id } = req.body;

    // Validate required fields
    if (!user_id || !event_id) {
      return res.status(400).json({ error: 'User ID and Event ID are required' });
    }

    // Fetch current saved_event_ids for the user
    const userQuery = `
          SELECT saved_event_ids FROM users WHERE id = $1;
      `;
    const userResult = await client.query(userQuery, [user_id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    let savedEventIds = userResult.rows[0].saved_event_ids || [];
    let action;

    // Check if the event is already saved
    if (savedEventIds.includes(event_id)) {
      // Remove the event from the saved_event_ids array
      savedEventIds = savedEventIds.filter(id => id !== event_id);
      action = 'unsaved';
    } else {
      // Add the event to the saved_event_ids array
      savedEventIds.push(event_id);
      action = 'saved';
    }

    // Update the user's saved_event_ids array
    const updateQuery = `
          UPDATE users
          SET saved_event_ids = $1
          WHERE id = $2
          RETURNING saved_event_ids;
      `;
    const updateResult = await client.query(updateQuery, [savedEventIds, user_id]);

    res.status(200).json({
      message: `Event successfully ${action}`,
      savedEventIds: updateResult.rows[0].saved_event_ids,
    });
  } catch (error) {
    console.error('Error toggling event save:', error);
    res.status(500).json({ error: 'An error occurred while toggling the event' });
  }
};



// Delete Event Controller
export const deleteEvent = async (req, res) => {
  const { id } = req.params; // Event ID from the request parameters

  try {
    // Check if the event exists
    const eventQuery = 'SELECT * FROM events WHERE id = $1';
    const eventResult = await client.query(eventQuery, [id]);

    if (eventResult.rowCount === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Delete the event
    const deleteQuery = 'DELETE FROM events WHERE id = $1';
    await client.query(deleteQuery, [id]);

    return res.status(200).json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    return res.status(500).json({ message: 'Failed to delete event', error: error.message });
  }
};





/**
 * Filter events by price range.
 */
export const filterByPrice = async (req, res) => {
  try {
    const { minPrice, maxPrice } = req.body;

    // Debug the incoming request body
    console.log('Request body:', req.body);

    // Parse and validate minPrice and maxPrice
    const min = parseInt(minPrice, 10);
    const max = parseInt(maxPrice, 10);


    if (isNaN(min) || isNaN(max)) {
      return res.status(400).json({
        success: false,
        message: 'minPrice and maxPrice must be valid numbers.',
      });
    }

    // Query the database using parameterized queries
    const query = `SELECT * FROM events WHERE price BETWEEN $1 AND $2`;
    console.log('Executing query:', query, 'with values:', [min, max]);

    const result = await client.query(query, [min, max]);

    // Respond with the filtered data
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error filtering events by price:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
* Filter events by date range.
*/
export const filterByDate = async (req, res) => {
  const { startDate, endDate } = req.body;
  console.log(startDate, endDate);

  if (!startDate || !endDate) {
    return res.status(400).json({ success: false, message: 'startDate and endDate are required' });
  }

  // Validate and parse dates
  const parsedStartDate = new Date(startDate);
  const parsedEndDate = new Date(endDate);

  // Check if parsed dates are valid
  if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
    return res.status(400).json({ success: false, message: 'Invalid date format' });
  }

  try {
    const result = await client.query(
      `SELECT * FROM events WHERE date BETWEEN $1 AND $2`,
      [parsedStartDate.toISOString().split('T')[0], parsedEndDate.toISOString().split('T')[0]]
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error filtering by date:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
* Filter events by timing.
*/
export const filterByTiming = async (req, res) => {
  const { startTime, endTime } = req.body;


  if (!startTime || !endTime) {
    return res.status(400).json({ success: false, message: 'startTime and endTime are required' });
  }

  try {
    const result = await client.query(
      `SELECT * FROM events WHERE date::time BETWEEN $1 AND $2`,
      [startTime, endTime]
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error filtering by timing:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
* Filter events by age limit.
*/
export const filterByAge = async (req, res) => {
  const { minAge, maxAge } = req.body;

  if (!minAge || !maxAge) {
    return res.status(400).json({ success: false, message: 'minAge and maxAge are required' });
  }

  try {
    const result = await client.query(
      `SELECT * FROM events WHERE age BETWEEN $1 AND $2`,
      [minAge, maxAge]
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error filtering by age:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
* Filter events by category.
*/
export const filterByCategory = async (req, res) => {
  const { category } = req.body;
  console.log(category);

  if (!category) {
    return res.status(400).json({ success: false, message: 'Category is required' });
  }

  try {
    const result = await client.query(
      `SELECT * FROM events WHERE category = $1`,
      [category]
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error filtering by category:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

