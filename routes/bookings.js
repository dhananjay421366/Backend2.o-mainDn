// Import necessary modules
import express from 'express';
import { create, getDetails, listUserBookings1, encrypt, decrypt, encrypt2, dcrypt2, CancelBooking, CheckTicket } from '../controllers/bookingController.js';
import { authenticate_user, authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router(); // Create an Express router

// Route to create a new booking, protected by authentication middleware
router.post('/', create);

// Route to get details of a specific booking, protected by authentication middleware
router.get('/:id', getDetails);

// Route to list all bookings made by a specific user, protected by authentication middleware
router.get('/user/:userId', listUserBookings1);

//Route  to   cancel  bookings
router.post("/cancel-booking",CancelBooking);

//Route to  check tickets availability
router.post("/check-availability", CheckTicket)
router.post('/decrypt', decrypt);
router.post('/encrypt', encrypt);
router.post('/encrypt2', encrypt2)
router.post('/dcrypt2', dcrypt2)

export default router; // Export the router
