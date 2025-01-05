// Import necessary modules
import express from 'express';
import { generate } from '../controllers/ticketController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router(); // Create an Express router

// Route to generate tickets for a booking, protected by authentication middleware
router.post('/generate', authenticate, generate);

export default router; // Export the router
