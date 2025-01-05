import express from 'express';
import { register, verify, login, logout, forgot_password1, reset_password, updateOrganizerProfile, getOrganizerProfile, AcceptTermsAndConditions, updateBankDetails, requestVerificationCode } from '../controllers/organizerController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { upload } from '../middlewares/multer.middleware.js';


const router = express.Router();

router.post('/register', register);
router.get('/verify/:token', verify);
router.post('/login', login);
router.get('/logout', logout);
router.get('/profile', authenticate, getOrganizerProfile);
router.put(
    '/profile',
    authenticate, // Ensures the user is authenticated
    upload.fields([
        {
            name: 'profile_picture', // Expecting a field named "event_poster"
            maxCount: 1, // Allow only 1 file for this field
        },
    ]), updateOrganizerProfile);
router.post('/forgot_password', forgot_password1);
router.post('/reset_password/:id/:token', reset_password);
router.post('/accept-terms', authenticate, AcceptTermsAndConditions);
router.post('/request-VerificationCode', authenticate, requestVerificationCode);
router.post('/update-bank-details', authenticate, updateBankDetails);

export default router;
