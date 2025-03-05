// Import necessary modules
import express from 'express';
import { CancelBooking, CheckTicket, create, dcrypt2, decrypt, encrypt, encrypt2, getDetails, listUserBookings1 } from '../controllers/bookingController.js';
import { toggleBookingStatus } from '../services/bookingService.js';

const router = express.Router(); // Create an Express router

// Route to create a new booking, protected by authentication middleware
router.post('/', create);

// Route to get details of a specific booking, protected by authentication middleware
router.get('/:id', getDetails);

// Route to list all bookings made by a specific user, protected by authentication middleware
router.get('/user/:userId', listUserBookings1);

//Route  to   cancel  bookings
router.post("/cancel-booking", CancelBooking);

// toogle booking status 
router.put("/events/:event_id/booking-status", toggleBookingStatus);

//Route to  check tickets availability
router.post("/check-availability", CheckTicket)
router.post('/decrypt', decrypt);
router.post('/encrypt', encrypt);
router.post('/encrypt2', encrypt2)
router.post('/dcrypt2', dcrypt2)

export default router; // Export the router
