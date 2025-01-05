import crypto from 'crypto';
import { registerOrganizer, verifyEmail, loginOrganizer, forgot_password, verify_token_reset_password } from '../services/authService.js';
import { sendVerificationEmail, sendresetpassword, sendNotificationEmail } from '../services/emailService.js';
import client from '../config.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
export const register = async (req, res) => {
  try {
    const { email, password, phonenumber, organizer_name, Legal_Name } = req.body;

    // Validate required fields
    if (!email || !password || !phonenumber || !organizer_name || !Legal_Name) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // Register the organizer
    const organizer = await registerOrganizer(email, password, phonenumber, organizer_name, Legal_Name);

    // Construct the verification endpoint
    const verificationEndpoint = `${process.env.BACKEND_URL}/organizers/verify/${organizer.verification_token}`;

    // Send verification email
    await sendVerificationEmail(organizer.email, verificationEndpoint);

    return res.status(201).json({
      message: 'Registration successful. Please verify your email.',
      verificationEndpoint, // Optionally include for debugging or testing (not recommended in production)
    });
  } catch (error) {
    console.error('Error during registration:', error.message);
    return res.status(500).json({ error: 'An error occurred during registration.' });
  }
};
export const verify = async (req, res) => {
  try {
    const token = req.params.token;
    await verifyEmail(token);
    res.status(200).json({ message: 'Email verified successfully.' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
export const login = async (req, res) => {
  try {
    const { email, password } = await req.body;
    const token = await loginOrganizer(email, password);
    console.log(token)
    if (token) {
      // await client.query('UPDATE organizers SET verification_token = $1 WHERE email = $2', [token,email]);
      res.cookie("token", token);
    }
    res.status(200).json({ message: 'Login successful.', token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
export const logout = async (req, res) => {
  try {
    res.cookie("token", '');//it is not working
    res.status(200).json({ message: 'Logout successful.' });
  } catch (error) {
    res.status(400).json({ message: 'something went wrong' })
  }
}
// Get Organizer Profile
export const getOrganizerProfile = async (req, res) => {
  try {
    const organizerId = req.user?.id;
    console.log('Organizer ID from token:', organizerId); // Log the organizer ID

    if (!organizerId) {
      console.error('Organizer ID not found in request');
      return res.status(401).json({ error: 'Unauthorized: Organizer ID missing.' });
    }

    // Fetch organizer details from the database
    const organizerResult = await client.query('SELECT * FROM organizers WHERE id = $1', [organizerId]);
    const organizer = organizerResult.rows[0];

    if (!organizer) {
      return res.status(404).json({ error: 'Organizer not found' });
    }

    // // Remove sensitive information
    // delete organizer.password_hash;

    // Return organizer data
    return res.json(organizer);
  } catch (err) {
    console.error('Error in getOrganizerProfile:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
// Update Organizer Profile
export const updateOrganizerProfile = async (req, res) => {
  const organizerId = req.user?.id; // Ensure the organizer ID is available
  const { name, phonenumber, email } = req.body; // Exclude profile_picture from body as it comes from `req.files`

  try {
    // Validate input data
    if (!organizerId) {
      return res.status(401).json({ error: 'Unauthorized: Organizer ID is missing' });
    }

    if (!name || !phonenumber || !email) {
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

    // Update organizer data in the database
    const updateQuery = `
      UPDATE organizers
      SET 
        organizer_name = $1, 
        phonenumber = $2, 
        email = $3, 
        ${finalProfilePictureUrl ? 'profile_picture = $4,' : ''} 
        updated_at = NOW()
      WHERE id = $5
    `;

    const updateValues = finalProfilePictureUrl
      ? [name, phonenumber, email, finalProfilePictureUrl, organizerId]
      : [name, phonenumber, email, organizerId];

    await client.query(updateQuery, updateValues);

    // Fetch updated organizer profile data
    const organizerResult = await client.query('SELECT * FROM organizers WHERE id = $1', [organizerId]);
    const updatedOrganizer = organizerResult.rows[0];

    if (!updatedOrganizer) {
      return res.status(404).json({ error: 'Organizer not found' });
    }

    // Exclude sensitive information
    delete updatedOrganizer.password_hash;

    return res.status(200).json({ message: 'Profile updated successfully', organizer: updatedOrganizer });
  } catch (err) {
    console.error('Error updating organizer profile:', err);
    return res.status(500).json({ error: 'An internal server error occurred' });
  }
};
// Store verification codes temporarily in memory or a more secure location like Redis
const verificationCodes = new Map();

export const requestVerificationCode = async (req, res) => {
  const organizerId = req.user?.id;

  try {
    if (!organizerId) {
      return res.status(401).json({ error: 'Unauthorized: Organizer ID is missing.' });
    }

    // Generate a 6-character verification code
    const generatedCode = crypto.randomBytes(3).toString('hex');

    const organizerResult = await client.query('SELECT email FROM organizers WHERE id = $1', [organizerId]);
    const organizerEmail = organizerResult.rows[0]?.email;

    if (!organizerEmail) {
      return res.status(404).json({ error: 'Organizer email not found.' });
    }

    // Save the code for verification (in-memory or Redis for better performance)
    verificationCodes.set(organizerId, { code: generatedCode, timestamp: Date.now() });

    // Send verification email
    await sendNotificationEmail(
      organizerEmail,
      'Verification Code for Updating Bank Details',
      `Your verification code is: ${generatedCode}`
    );

    return res.status(200).json({ message: 'Verification code sent to your email.' });
  } catch (err) {
    console.error('Error sending verification code:', err);
    return res.status(500).json({ error: 'An error occurred while sending the verification code.' });
  }
};
export const updateBankDetails = async (req, res) => {
  const organizerId = req.user?.id;
  const { BeneficiaryName, AccountNumber, Bank_IFCCode, verificationCode } = req.body;

  try {
    if (!organizerId) {
      return res.status(401).json({ error: 'Unauthorized: Organizer ID is missing.' });
    }

    // Validate the input data for bank details
    if (!BeneficiaryName || !AccountNumber || !Bank_IFCCode) {
      return res.status(400).json({ error: 'All fields (BeneficiaryName, AccountNumber, Bank_IFCCode) are required.' });
    }

    if (!verificationCode) {
      return res.status(400).json({ error: 'Verification code is required.' });
    }

    // Retrieve and validate the verification code
    const storedData = verificationCodes.get(organizerId);
    if (!storedData) {
      return res.status(400).json({ error: 'Verification code not found. Please request a new code.' });
    }

    const { code, timestamp } = storedData;

    // Check if the code has expired (e.g., 10 minutes expiration)
    const isCodeExpired = Date.now() - timestamp > 10 * 60 * 1000; // 10 minutes
    if (isCodeExpired) {
      verificationCodes.delete(organizerId);
      return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
    }

    if (verificationCode !== code) {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    // Remove the used code from memory
    verificationCodes.delete(organizerId);

    // Update bank details in the database
    const updateQuery = `
      UPDATE organizers
      SET 
        BeneficiaryName = $1, 
        AccountNumber = $2, 
        Bank_IFCCode = $3, 
        updated_at = NOW()
      WHERE id = $4
    `;
    const updateValues = [BeneficiaryName, AccountNumber, Bank_IFCCode, organizerId];
    await client.query(updateQuery, updateValues);

    return res.status(200).json({ message: 'Bank details updated successfully.' });
  } catch (err) {
    console.error('Error updating bank details:', err);
    return res.status(500).json({ error: 'An error occurred while updating bank details.' });
  }
};


export const forgot_password1 = async (req, res) => {
  const { email } = req.body;
  const secretKey = process.env.SECRET_KEY;
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
// Reset Password Handler
export const reset_password = async (req, res) => {
  const { Newpassword } = req.body;
  const { id, token } = req.params;

  try {
    console.log('Password:', Newpassword, 'ID:', id, 'Token:', token);

    // Verify the token and reset the password
    await verify_token_reset_password(id, token, Newpassword);

    res.status(200).json({ message: 'Password updated/reset successfully' });
  } catch (error) {
    console.error('Error in reset_password:', error.message);
    res.status(400).json({ error: error.message || 'Something went wrong' });
  }
};
// Accept Term Conditions organizer 
export const AcceptTermsAndConditions = async (req, res) => {
  try {
    await client.query('UPDATE organizers SET terms_accepted = true WHERE id = $1', [req.user?.id]);
    res.status(200).json({ message: 'Terms accepted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}


