import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import client from '../config.js';
import dotenv from 'dotenv'
dotenv.config();
import { sendVerificationEmail, sendresetpassword } from '../services/emailService.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';

// User Registration
const saltRounds = 10
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
      'SELECT id FROM users WHERE email = $1 OR phone_number = $2',
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
    const verification_endpoint = `${process.env.BACKEND_URL}/users/verify/${verification_token}`
    await sendVerificationEmail(email, verification_endpoint);//sending verification link of frontend abhi backend de rahe hai
    return res.status(201).json({ message: 'User registered successfully', verification_endpoint });
  } catch (err) {
    res.status(500).json({ error: err });
  }
};

export const verifyEmail = async (req, res) => {
  const token = req.params.token;
  console.log(token)
  const decoded = jwt.verify(token, process.env.SECRET_KEY);
  const email = decoded.email;
  const user = await client.query('SELECT * FROM users WHERE email = $1', [email]);
  try {
    await client.query('UPDATE users SET verified = TRUE WHERE email = $1', [email]);
    res.status(200).json({ message: 'Email verified successfully.' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate input data
    if (!email || !password) {
      return res.status(400).json({ error: 'Invalid input data' });
    }

    // Query for user by email
    const userResult = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];
    console.log(user);

    if (!user) {
      return res.status(403).json({ error: 'Authentication failed' });
    }

    // Check if the email is verified
    if (!user.verified) {
      // Generate the verification token
      const verification_token = jwt.sign({ email }, process.env.SECRET_KEY, { expiresIn: '1d' });

      // Create the verification link
      const verification_link = `${process.env.BACKEND_URL}/users/verify/${verification_token}`;

      // Send the verification email
      await sendVerificationEmail(user.email, verification_link);

      return res.status(400).json({ error: 'Email not verified. A verification email has been sent.' });
    }

    // Compare passwords
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(403).json({ error: 'Authentication failed' });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.SECRET_KEY, {
      expiresIn: '1d',
    });
    res.cookie('token', token);

    // Update last login timestamp
    await client.query('UPDATE users SET updated_at = NOW() WHERE id = $1', [user.id]);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        phone_number: user?.phone_number,
        user_name: user?.user_name,
        verified: true,
      },
    });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
};



export const logout = async (req, res) => {
  try {
    res.cookie("token", '');
    res.status(200).json({ message: 'Logout successful.' });
  } catch (error) {
    res.status(400).json({ message: 'something went wrong' })
  }
}

export const forgot_password1 = async (req, res) => {
  const { email } = req.body;
  const link = await forgot_password(email);
  if (link === 'User not found') {//not good practices
    res.status(404).json(`you entering the wrong gmail`)
  }
  else {
    try {
      //sending email to verify that he wants to update the pasword
      await sendresetpassword(email, link)
      res.status(200).json(`${link}`);
    } catch (error) {
      res.status(400).json(`we can not generate link`)
    }
  }
}


//send token and password
export const reset_password = async (req, res) => {
  const { password } = req.body;
  const { id, token } = req.params;
  try {
    await verify_token_reset_password(id, token, password);
    res.status(200).json(`password updated/reset succcessfully`)
  } catch (error) {
    res.status(400).json(`something is going wrong `);
  }
}

// // Get User Profile
export const getProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    console.log('User ID from token:', userId); // Log the user ID

    if (!userId) {
      console.error('User ID not found in request');
      return res.status(401).json({ error: 'Unauthorized: User ID missing.' });
    }

    // Fetch user details from the database
    const userResult = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove sensitive information
    delete user.password_hash;

    // Return user data
    return res.json(user);
  } catch (err) {
    console.error('Error in getProfile:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


// Update User Profile
export const updateProfile = async (req, res) => {
  const userId = req.user?.id; // Ensure the user ID is available
  const { name, phone_number, email } = req.body; // Exclude profile_picture from body as it comes from `req.files`

  try {
    // Validate input data
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: User ID is missing' });
    }

    if (!name || !phone_number || !email) {
      return res.status(400).json({ error: 'All fields (name, phone_number, email) are required' });
    }

    // Check if profile picture is uploaded
    const profilePictureFile = req.files?.profile_picture?.[0];
    let finalProfilePictureUrl;

    if (profilePictureFile) {
      const localFilePath = profilePictureFile?.path; // Path of the uploaded file
      console.log('Local File Path:', localFilePath);

      // Upload the image to Cloudinary
      const uploadedImage = await uploadOnCloudinary(localFilePath);
      if (!uploadedImage || !uploadedImage?.url) {
        return res.status(500).json({ error: 'Failed to upload profile picture to Cloudinary.' });
      }

      finalProfilePictureUrl = uploadedImage?.url; // Use the Cloudinary URL for the profile picture
      console.log('Uploaded Profile Picture URL:', finalProfilePictureUrl);
    }

    // Update user data in the database
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

    // Fetch updated user profile data
    const userResult = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
    const updatedUser = userResult.rows[0];

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Exclude sensitive information
    delete updatedUser.password_hash;

    return res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (err) {
    console.error('Error updating profile:', err);
    return res.status(500).json({ error: 'An internal server error occurred' });
  }
};

//how put is working 

const forgot_password = async (email) => {
  const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
  if (result.rows.length === 0) {
    return ('User not found');//not a good practices
  }
  else {
    const user = result.rows[0];
    const key = process.env.SECRET_KEY + user.password_hash;
    const token = jwt.sign(user.email,

    );//add here timer for token expires
    const link = `http://localhost:5000/users/reset_password/${user.id}/${token}`;
    return link;
  }
}

const verify_token_reset_password = async (id, token, password) => {
  const result = await client.query('SELECT * FROM users WHERE id = $1', [id]);
  const user = result.rows[0];
  const Key = process.env.SECRET_KEY + user.password_hash;
  const verification = await jwt.verify(token, Key);
  try {
    if (verification) {
      const hash = await bcrypt.hash(password, saltRounds);
      await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, id]);
      res.status(200).json(`password updated/reset succcessfully`)
    }
  } catch (error) {
    res.status(400).json(`something is going wrong `, error);
  }

}