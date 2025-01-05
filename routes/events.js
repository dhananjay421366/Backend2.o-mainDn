
import express from 'express';
import { create, list, getDetails, listofallevents, filterByPrice, filterByDate, filterByTiming, filterByAge, filterByCategory, findEventsByOrganizerId, toggleLikeEvent, toggleSaveEvent, deleteEvent, publishEvent, unpublishEvent, updateEvents } from '../controllers/eventController.js';
import { authenticate } from '../middlewares/authMiddleware.js'; // Middleware for authentication
import { upload } from '../middlewares/multer.middleware.js'; // Multer middleware for file uploads

const router = express.Router(); // Create an Express router

// Route to create a new event
// Protected by authentication middleware and handles file uploads
router.post(
  '/create_events',
  authenticate, // Ensures the user is authenticated
  upload.fields([
    {
      name: 'event_poster', // Expecting a field named "event_poster"
      maxCount: 1, // Allow only 1 file for this field
    },
  ]),
  create // Event creation controller
);

// Route to list all events without filters
router.get('/listofallevents', listofallevents);

// Route to list events with optional filters (e.g., by place)
router.get('/', list);

// Route to get details of a specific event by its ID
router.get('/:id', getDetails);
// Route to publish an event
router.put('/publish', publishEvent);

// Route to unpublish an event
router.put('/unpublish', unpublishEvent);

//Route   to  edit  events  deatils 
// router.put('/editevent/:eventId', updateEvents)
router.put(
  '/editevent/:eventId',
  authenticate,
  // Ensures the user is authenticated
  upload.fields([
    {
      name: 'event_poster',  // Removed the space before event_poster
      maxCount: 1, // Allow only 1 file for this field
    },
  ]),
  updateEvents
);

//Route  to like the  event 
router.post('/:eventId/toggle-like', toggleLikeEvent)
//Route to  save   event 
router.post('/toggle-save', toggleSaveEvent);
// DELETE request to delete an event
router.delete('/events/:id', deleteEvent);

router.post('/organizer/:id', findEventsByOrganizerId);
router.post('/price', filterByPrice);
router.post('/date', filterByDate);
router.post('/timing', filterByTiming);
router.post('/age', filterByAge);
router.post('/category', filterByCategory);


export default router; // Export the router
