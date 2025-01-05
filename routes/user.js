import express from 'express';
import { register, login, logout, getProfile, updateProfile, verifyEmail, forgot_password1 } from '../controllers/userController.js';
import { authenticate, authenticate_user } from '../middlewares/authMiddleware.js';
import { sendOtp } from '../services/authService.js';
import { upload } from '../middlewares/multer.middleware.js';

const router = express.Router();

router.post('/register', register);
router.get('/verify/:token', verifyEmail);//some doubt
router.post('/send-otp', sendOtp)
router.post('/login', login);
router.get('/logout', logout);//doubt
router.post('/forgot_password', forgot_password1); //doubt
router.post('/reset_password/:id/:token');//doubt
router.get('/profile', authenticate, getProfile);
router.put(
    '/profile',
    authenticate, // Ensures the user is authenticated
    upload.fields([
        {
            name: 'profile_picture', // Expecting a field named "event_poster"
            maxCount: 1, // Allow only 1 file for this field
        },
    ]), updateProfile);

export default router;
