import crypto from "crypto";
import {
  registerOrganizer,
  verifyEmail,
  loginOrganizer,
  forgot_password,
  verify_token_reset_password,
} from "../services/authService.js";
import {
  sendVerificationEmail,
  sendResetPassword,
  sendNotificationEmail,
} from "../services/emailService.js";
import client from "../config.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const sendErrorResponse = (res, status, message) => {
  return res.status(status).json({ error: message });
};

export const register = async (req, res) => {
  try {
    const { email, password, phonenumber, organizer_name, Legal_Name } =
      req.body;

    if (!email || !password || !phonenumber || !organizer_name || !Legal_Name) {
      return sendErrorResponse(res, 400, "All fields are required.");
    }

    const organizer = await registerOrganizer(
      email,
      password,
      phonenumber,
      organizer_name,
      Legal_Name
    );

    const verificationEndpoint = `${process.env.BACKEND_URL}/organizers/verify/${organizer.verification_token}`;
    await sendVerificationEmail(organizer.email, verificationEndpoint);

    return res.status(201).json({
      message: "Registration successful. Please verify your email.",
      verificationEndpoint,
    });
  } catch (error) {
    console.error("Error during registration:", error.message);
    return sendErrorResponse(
      res,
      500,
      "An error occurred during registration."
    );
  }
};

export const verify = async (req, res) => {
  try {
    const token = req.params.token;
    await verifyEmail(token);
    res.status(200).json({ message: "Email verified successfully." });
  } catch (error) {
    sendErrorResponse(res, 400, error.message);
  }
};

export const login = async (req, res) => {
  try {
    console.log(req.user);
    const { email, password } = req.body;
    const token = await loginOrganizer(email, password);
    if (token) {
      res.cookie("token", token);
      return res.status(200).json({ message: "Login successful.", token });
    }
    return sendErrorResponse(res, 400, "Invalid credentials.");
  } catch (error) {
    sendErrorResponse(res, 400, error.message);
  }
};

export const logout = async (req, res) => {
  try {
    res.cookie("token", "");
    res.status(200).json({ message: "Logout successful." });
  } catch (error) {
    sendErrorResponse(res, 400, "Something went wrong");
  }
};

export const getOrganizerProfile = async (req, res) => {
  try {
    const organizerId = req.user?.organizer_id;
    if (!organizerId) {
      return sendErrorResponse(res, 401, "Unauthorized: Organizer ID missing.");
    }

    const organizerResult = await client.query(
      "SELECT * FROM organizers WHERE organizer_id = $1",
      [organizerId]
    );
    const organizer = organizerResult.rows[0];

    if (!organizer) {
      return sendErrorResponse(res, 404, "Organizer not found");
    }

    return res.json(organizer);
  } catch (err) {
    console.error("Error in getOrganizerProfile:", err.message);
    sendErrorResponse(res, 500, "Internal server error");
  }
};

export const updateOrganizerProfile = async (req, res) => {
  const organizerId = req.user?.organizer_id;
  const { name, phonenumber, email } = req.body;

  if (!organizerId)
    return sendErrorResponse(res, 401, "Unauthorized: Organizer ID is missing");
  if (!name || !phonenumber || !email)
    return sendErrorResponse(
      res,
      400,
      "All fields (name, phone_number, email) are required"
    );

  try {
    const profilePictureFile = req.files?.profile_picture?.[0];
    let finalProfilePictureUrl;

    if (profilePictureFile) {
      const uploadedImage = await uploadOnCloudinary(profilePictureFile.path);
      if (!uploadedImage?.url) {
        return sendErrorResponse(
          res,
          500,
          "Failed to upload profile picture to Cloudinary."
        );
      }
      finalProfilePictureUrl = uploadedImage.url;
    }

    const updateQuery = `
      UPDATE organizers SET 
        organizer_name = $1, 
        phonenumber = $2, 
        email = $3, 
        ${finalProfilePictureUrl ? "profile_picture = $4," : ""} 
        updated_at = NOW()
      WHERE organizer_id = $5
    `;
    const updateValues = finalProfilePictureUrl
      ? [name, phonenumber, email, finalProfilePictureUrl, organizerId]
      : [name, phonenumber, email, organizerId];

    await client.query(updateQuery, updateValues);

    const updatedOrganizerResult = await client.query(
      "SELECT * FROM organizers WHERE organizer_id = $1",
      [organizerId]
    );
    const updatedOrganizer = updatedOrganizerResult.rows[0];

    if (!updatedOrganizer) {
      return sendErrorResponse(res, 404, "Organizer not found");
    }

    delete updatedOrganizer.password_hash;

    return res
      .status(200)
      .json({
        message: "Profile updated successfully",
        organizer: updatedOrganizer,
      });
  } catch (err) {
    console.error("Error updating organizer profile:", err);
    return sendErrorResponse(res, 500, "An internal server error occurred");
  }
};

// Request Verification Code
const verificationCodes = new Map();

export const requestVerificationCode = async (req, res) => {
  const organizerId = req.user?.organizer_id;

  if (!organizerId)
    return sendErrorResponse(
      res,
      401,
      "Unauthorized: Organizer ID is missing."
    );

  try {
    const generatedCode = crypto.randomBytes(3).toString("hex");
    const organizerResult = await client.query(
      "SELECT email FROM organizers WHERE organizer_id = $1",
      [organizerId]
    );
    const organizerEmail = organizerResult.rows[0]?.email;

    if (!organizerEmail)
      return sendErrorResponse(res, 404, "Organizer email not found.");

    verificationCodes.set(organizerId, {
      code: generatedCode,
      timestamp: Date.now(),
    });

    await sendNotificationEmail(
      organizerEmail,
      "Verification Code for Updating Bank Details",
      `Your verification code is: ${generatedCode}`
    );

    return res
      .status(200)
      .json({ message: "Verification code sent to your email." });
  } catch (err) {
    console.error("Error sending verification code:", err);
    return sendErrorResponse(
      res,
      500,
      "An error occurred while sending the verification code."
    );
  }
};

// Update Bank Details
export const updateBankDetails = async (req, res) => {
  const organizerId = req.user?.organizer_id;
  const { BeneficiaryName, AccountNumber, Bank_IFCCode, verificationCode } =
    req.body;

  if (!organizerId)
    return sendErrorResponse(
      res,
      401,
      "Unauthorized: Organizer ID is missing."
    );

  if (!BeneficiaryName || !AccountNumber || !Bank_IFCCode) {
    return sendErrorResponse(
      res,
      400,
      "All fields (BeneficiaryName, AccountNumber, Bank_IFCCode) are required."
    );
  }

  if (!verificationCode)
    return sendErrorResponse(res, 400, "Verification code is required.");

  try {
    const storedData = verificationCodes.get(organizerId);
    if (!storedData)
      return sendErrorResponse(
        res,
        400,
        "Verification code not found. Please request a new code."
      );

    const { code, timestamp } = storedData;
    const isCodeExpired = Date.now() - timestamp > 10 * 60 * 1000; // 10 minutes expiration

    if (isCodeExpired) {
      verificationCodes.delete(organizerId);
      return sendErrorResponse(
        res,
        400,
        "Verification code has expired. Please request a new code."
      );
    }

    if (verificationCode !== code)
      return sendErrorResponse(res, 400, "Invalid verification code.");

    verificationCodes.delete(organizerId);

    const updateQuery = `
      UPDATE organizers
      SET BeneficiaryName = $1, AccountNumber = $2, Bank_IFCCode = $3, updated_at = NOW()
      WHERE organizer_id = $4
    `;
    const updateValues = [
      BeneficiaryName,
      AccountNumber,
      Bank_IFCCode,
      organizerId,
    ];
    await client.query(updateQuery, updateValues);

    return res
      .status(200)
      .json({ message: "Bank details updated successfully." });
  } catch (err) {
    console.error("Error updating bank details:", err);
    return sendErrorResponse(
      res,
      500,
      "An error occurred while updating bank details."
    );
  }
};

// Forgot Password
export const forgot_password1 = async (req, res) => {
  const { email } = req.body;

  try {
    const link = await forgot_password(email);
    if (link === "User not found")
      return sendErrorResponse(res, 404, "You entered the wrong email.");

    await sendResetPassword(email, link);
    res.status(200).json(`${link}`);
  } catch (error) {
    sendErrorResponse(res, 400, "We cannot generate a link.");
  }
};

// Reset Password Handler
export const reset_password = async (req, res) => {
  const { Newpassword } = req.body;
  const { id, token } = req.params;
const  organizer_id = id

  try {
    await verify_token_reset_password(organizer_id, token, Newpassword);
    res.status(200).json({ message: "Password updated/reset successfully" });
  } catch (error) {
    sendErrorResponse(res, 400, error.message || "Something went wrong");
  }
};

// Accept Terms and Conditions
export const AcceptTermsAndConditions = async (req, res) => {
  try {
    await client.query(
      "UPDATE organizers SET terms_accepted = true WHERE organizer_id = $1",
      [req.user?.organizer_id]
    );
    res.status(200).json({ message: "Terms accepted successfully" });
  } catch (error) {
    sendErrorResponse(res, 500, error.message);
  }
};
