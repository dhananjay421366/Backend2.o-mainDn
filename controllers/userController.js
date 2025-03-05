import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import client from '../config.js';
import dotenv from 'dotenv';
dotenv.config();
import { sendVerificationEmail, sendResetPassword } from '../services/emailService.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';

const saltRounds = 10;

// User Registration
export const register = async (req, res) => {
  const { email, phone_number, password, FirstName, LastName } = req.body;

  try {
    // Validate input data
    if (!email || !password || !FirstName) {
      return res.status(400).json({ error: 'Invalid input data' });
    }

    // Validate phone number length
    if (!/^\d{10}$/.test(phone_number)) {
      return res.status(400).json({ error: 'Invalid phone number: Must be exactly 10 digits' });
    }

    // Check if the email or phone number already exists
    const existingUser = await client.query(
      'SELECT user_id FROM users WHERE email = $1 OR phone_number = $2',
      [email, phone_number]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email or phone number already exists' });
    }

    // Hash the password
    const password_hash = await bcrypt.hash(password, saltRounds);
    const verification_token = jwt.sign({ email }, process.env.SECRET_KEY, { expiresIn: '1d' });

    // Create a new user record
    await client.query(
      'INSERT INTO users (email, phone_number, password_hash, user_name, verification_token) VALUES ($1, $2, $3, $4, $5)',
      [email, phone_number, password_hash, FirstName, verification_token]
    );

    // Trigger Notification Service to send verification email/SMS
    const verification_endpoint = `${process.env.BACKEND_URL}/users/verify/${verification_token}`;
    await sendVerificationEmail(email, verification_endpoint);

    return res.status(201).json({ message: 'User registered successfully', verification_endpoint });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Email Verification
export const verifyEmail = async (req, res) => {
  const token = req.params.token;

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const email = decoded.email;

    const user = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!user.rows.length) return res.status(400).json({ error: 'User not found' });

    await client.query('UPDATE users SET verified = TRUE WHERE email = $1', [email]);
    return res.status(200).json({ message: 'Email verified successfully.' });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: error.message });
  }
};

// Login User
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate input data
    if (!email || !password) {
      return res.status(400).json({ error: 'Invalid input data' });
    }

    // Check if the user exists
    const userResult = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];
    if (!user) return res.status(403).json({ error: 'Authentication failed' });

    // Check if email is verified
    if (!user.verified) {
      const verification_token = jwt.sign({ email }, process.env.SECRET_KEY, { expiresIn: '1d' });
      const verification_link = `${process.env.BACKEND_URL}/users/verify/${verification_token}`;
      await sendVerificationEmail(email, verification_link);
      return res.status(400).json({ error: 'Email not verified. A verification email has been sent.' });
    }

    // Compare passwords
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(403).json({ error: 'Authentication failed' });

    // Generate a new JWT token
    const token = jwt.sign({ user_id: user.user_id, email: user.email }, process.env.SECRET_KEY, {
      expiresIn: '1d',
    });
    res.cookie('token', token);

    // Update user's token and last login time in the database
    await client.query(
      'UPDATE users SET verification_token = $1, updated_at = NOW() WHERE user_id = $2',
      [token, user.user_id]
    );

    return res.json({
      message: 'Login successful',
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        phone_number: user.phone_number,
        user_name: user.user_name,
        verified: user.verified,
      },
    });
  } catch (err) {
    console.error('Error during login:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};



// Logout User
export const logout = async (req, res) => {
  try {
    res.cookie("token", '', { expires: new Date(0) });
    return res.status(200).json({ message: 'Logout successful.' });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: 'Something went wrong' });
  }
};

// Forgot Password
export const forgot_password1 = async (req, res) => {
  const { email } = req.body;

  try {
    const link = await forgot_password(email);
    if (link === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }

    await sendResetPassword(email, link);
    return res.status(200).json({ message: 'Password reset link sent' });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: 'We cannot generate the reset link' });
  }
};

// Reset Password
export const reset_password = async (req, res) => {
  const { password } = req.body;
  const { id, token } = req.params;

  try {
    await verify_token_reset_password(id, token, password);
    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: 'Something went wrong during password reset' });
  }
};

// Get User Profile
export const getProfile = async (req, res) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized: User ID missing.' });

    const userResult = await client.query('SELECT * FROM users WHERE user_id = $1', [userId]);
    const user = userResult.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    delete user.password_hash; // Remove sensitive information
    return res.json(user);
  } catch (err) {
    console.error('Error in getProfile:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Update User Profile
export const updateProfile = async (req, res) => {
  const userId = req.user?.user_id;
  const { name, phone_number, email } = req.body;

  try {
    if (!userId) return res.status(401).json({ error: 'Unauthorized: User ID is missing' });

    if (!name || !phone_number || !email) {
      return res.status(400).json({ error: 'All fields (name, phone_number, email) are required' });
    }

    const profilePictureFile = req.files?.profile_picture?.[0];
    let finalProfilePictureUrl;

    if (profilePictureFile) {
      const localFilePath = profilePictureFile.path;
      const uploadedImage = await uploadOnCloudinary(localFilePath);
      if (!uploadedImage?.url) {
        return res.status(500).json({ error: 'Failed to upload profile picture to Cloudinary.' });
      }
      finalProfilePictureUrl = uploadedImage.url;
    }

    const updateQuery = `
      UPDATE users
      SET 
        user_name = $1, 
        phone_number = $2, 
        email = $3, 
        ${finalProfilePictureUrl ? 'profile_picture = $4,' : ''} 
        updated_at = NOW()
      WHERE id = $5
    `;

    const updateValues = finalProfilePictureUrl
      ? [name, phone_number, email, finalProfilePictureUrl, userId]
      : [name, phone_number, email, userId];

    await client.query(updateQuery, updateValues);

    const userResult = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
    const updatedUser = userResult.rows[0];

    delete updatedUser.password_hash; // Remove sensitive information
    return res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (err) {
    console.error('Error updating profile:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Forgot Password Helper
const forgot_password = async (email) => {
  const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
  if (result.rows.length === 0) return 'User not found';

  const user = result.rows[0];
  const key = process.env.SECRET_KEY + user.password_hash;
  const token = jwt.sign({ email: user.email }, key, { expiresIn: '1h' });
  const link = `${process.env.BACKEND_URL}/users/reset_password/${user.id}/${token}`;

  return link;
};

// Reset Password Verification Helper
const verify_token_reset_password = async (id, token, password) => {
  const result = await client.query('SELECT * FROM users WHERE user_id = $1', [id]);
  const user = result.rows[0];
  console.log(user);
  const key = process.env.SECRET_KEY;
  console.log("the key is :", key);
  console.log("the token is :", token);

  try {
    const verification = await jwt.verify(token, key);
    console.log(verification);
    if (verification) {
      const hash = await bcrypt.hash(password, saltRounds);
      await client.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [hash, id]);
    }
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};
