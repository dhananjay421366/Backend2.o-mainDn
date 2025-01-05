import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import client from '../config.js';
import pkg from 'twilio';
const { Twilio } = pkg;
import admin from 'firebase-admin';
const saltRounds = 10;
import dotenv from 'dotenv'
dotenv.config();

export const registerOrganizer = async (email, password, phonenumber, organizer_name, Legal_Name) => {
  const hash = await bcrypt.hash(password, saltRounds);

  const existingUser = await client.query('SELECT * FROM organizers WHERE email = $1', [email]);
  if (existingUser.rows.length > 0) {
    throw new Error('Email already exists');
  }

  const verificationToken = jwt.sign({ id: existingUser.id, email: email }, process.env.SECRET_KEY, { expiresIn: '1d' });
  const result = await client.query(
    'INSERT INTO organizers (email, password_hash, phonenumber, verification_token, organizer_name , Legal_Name) VALUES ($1, $2, $3, $4,$5, $6) RETURNING *',
    [email, hash, phonenumber, verificationToken, organizer_name, Legal_Name]
  );

  return result.rows[0];
};

export const verifyEmail = async (token) => {
  const decoded = jwt.verify(token, process.env.SECRET_KEY);

  const email = decoded.email;

  const organizer = await client.query('SELECT * FROM organizers WHERE email = $1', [email]);
  if (organizer.rows.length === 0) {
    throw new Error('Invalid token');
  }

  await client.query('UPDATE organizers SET verified = TRUE WHERE email = $1', [email]);

};

export const loginOrganizer = async (email, password) => {
  const result = await client.query('SELECT * FROM organizers WHERE email = $1', [email]);
  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  const organizer = result.rows[0];
  const isPasswordValid = await bcrypt.compare(password, organizer.password_hash);
  if (!isPasswordValid) {
    throw new Error('Invalid password');
  }

  if (!organizer.verified) {
    throw new Error('Email not verified');//what is throw here
  }

  const token = jwt.sign({ id: organizer.id, email: organizer.email }, process.env.SECRET_KEY, {
    expiresIn: '1d',
  });
  return token;
};

export const forgot_password = async (email) => {
  const result = await client.query('SELECT * FROM organizers WHERE email = $1', [email]);
  const secretKey = process.env.SECRET_KEY;

  if (result.rows.length === 0) {
    return ('User not found');//not a good practices
  }
  else {
    const organizer = result.rows[0];
    const key = secretKey + organizer.password_hash;
    const token = jwt.sign(organizer.email, key);//add here timer for token expires
    const link = `http://localhost:5000/organizers/reset_password/${organizer.id}/${token}`;
    return link;
  }
}
// Verify Token and Reset Password Logic
export const verify_token_reset_password = async (id, token, Newpassword) => {
  // Fetch organizer from the database
  const result = await client.query('SELECT * FROM organizers WHERE id = $1', [id]);
  const organizer = result.rows[0];

  if (!organizer) {
    throw new Error('Organizer not found');
  }

  const secretKey = process.env.SECRET_KEY;
  if (!secretKey) {
    throw new Error('Missing SECRET_KEY in environment variables');
  }

  const Key = secretKey;
  console.log('Constructed Key for Verification:', Key);

  try {
    // Verify the token
    const verification = jwt.verify(token, Key);
    console.log('Token Verified Successfully:', verification);

    // If verification passes, hash the new password
    const hash = await bcrypt.hash(Newpassword, 10);
    await client.query('UPDATE organizers SET password_hash = $1 WHERE id = $2', [hash, id]);
  } catch (err) {
    console.error('Token verification error:', err.message);
    throw new Error('Token verification failed');
  }
};

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}


// In-memory storage for OTP
const otpStorage = {};

// Send OTP Function
export const sendOtp = async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  try {
    const verificationId = await admin
      .auth()
      .createCustomToken(phoneNumber);

    // Simulate sending OTP via SMS (For actual SMS, integrate with Firebase)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStorage[phoneNumber] = otp;

    console.log(`OTP for ${phoneNumber}: ${otp}`);
    res.status(200).json({ verificationId, message: 'OTP sent successfully (Check server logs for OTP).' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Verify OTP Function
export const verifyOtp = async (req, res) => {
  const { phoneNumber, otp } = req.body;

  if (!phoneNumber || !otp) {
    return res.status(400).json({ error: 'Phone number and OTP are required' });
  }

  try {
    if (otpStorage[phoneNumber] === otp) {
      delete otpStorage[phoneNumber];

      // Create a Firebase token for the user
      const userToken = await admin.auth().createCustomToken(phoneNumber);

      return res.status(200).json({ message: 'OTP verified successfully', token: userToken });
    } else {
      return res.status(400).json({ error: 'Invalid OTP' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
