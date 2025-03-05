import express from 'express';
import { register, login, logout, getProfile, updateProfile, verifyEmail, forgot_password1, reset_password } from '../controllers/userController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { upload } from '../middlewares/multer.middleware.js';

const router = express.Router();
router.post('/register', register);
router.get('/verify/:token', verifyEmail);//some doubt
router.post('/login', login);
router.get('/logout', logout);//doubt
router.post('/forgot_password', forgot_password1); //doubt
// router.post('/reset_password/:id/token');//doubt
router.post('/reset_password/:id/:token', reset_password);
router.get('/profile', authenticate, getProfile);
router.put(
    '/profile/update',
    authenticate, // Ensures the user is authenticated
    upload.fields([
        {
            name: 'profile_picture', // Expecting a field named "event_poster"
            maxCount: 1, // Allow only 1 file for this field
        },
    ]), updateProfile);

export default router;
