import axios from "axios";
import { cashfree } from "../config2.js";

const { clientId, clientSecret, verificationEndpoint } = cashfree;

const BANK_URL = `${verificationEndpoint}/bank-account`;
const UPI_URL = `${verificationEndpoint}/upi`;
const PAN_URL = `${verificationEndpoint}/pan`;
const GSTIN_URL = `${verificationEndpoint}/gstin`;

export const verifyBankAccount = async (bank_account, ifsc, name, user_id, phone) => {
  try {
    const response = await axios.post(
      `${BANK_URL}/sync`,
      {
        bank_account,
        ifsc,
        name,
        user_id,
        phone,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-client-id": clientId,
          "x-client-secret": clientSecret,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(error);
    throw new Error(`Bank account verification failed: ${error.response?.data?.message || error.message}`);
  }
};

export const getBavStatus = async (reference_id, user_id) => {
  try {
    const response = await axios.get(`${BANK_URL}`, {
      params: {
        reference_id,
        user_id,
      },
      headers: {
        "Content-Type": "application/json",
        "x-client-id": clientId,
        "x-client-secret": clientSecret,
      },
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to retrieve BAV status: ${error.response?.data?.message || error.message}`);
  }
};

export const verifyUPI = async (verificationData) => {
  try {
    const response = await axios.post(`${UPI_URL}`, verificationData, {
      headers: {
        "Content-Type": "application/json",
        "x-client-id": clientId,
        "x-client-secret": clientSecret,
      },
    });
    return response.data;
  } catch (error) {
    throw new Error(`UPI Verification failed: ${error.response?.data?.message || error.message}`);
  }
};

export const getUPIVerificationStatus = async (params) => {
  try {
    const { verification_id, reference_id } = params;

    if (!verification_id && !reference_id) {
      throw new Error("Either verification_id or reference_id must be provided.");
    }

    const queryParams = {};
    if (verification_id) queryParams.verification_id = verification_id;
    if (reference_id) queryParams.reference_id = reference_id;

    const response = await axios.get(`${UPI_URL}`, {
      params: queryParams,
      headers: {
        "Content-Type": "application/json",
        "x-client-id": clientId,
        "x-client-secret": clientSecret,
      },
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to get UPI verification status: ${error.response?.data?.message || error.message}`);
  }
};

export const verifyPAN = async (pan, name) => {
  try {
    if (!pan || !name) {
      throw new Error("PAN and Name are required for verification.");
    }

    const response = await axios.post(
      `${PAN_URL}`,
      { pan, name },
      {
        headers: {
          "Content-Type": "application/json",
          "x-client-id": clientId,
          "x-client-secret": clientSecret,
          "x-api-version": "2024-01-01",
        },
      }
    );
    return response.data;
  } catch (error) {
    if (error.response) {
      switch (error.response.status) {
        case 400:
          throw new Error("Validation error: " + error.response.data.message);
        case 401:
          throw new Error("Invalid client ID and client secret combination.");
        case 403:
          throw new Error("IP not whitelisted.");
        case 422:
          throw new Error("Insufficient balance to process the request.");
        case 500:
          throw new Error("Internal server error. Please try again later.");
        default:
          throw new Error("Unknown error occurred: " + error.message);
      }
    } else {
      throw new Error("Request failed: " + error.message);
    }
  }
};

export const getPANStatus = async (referenceId) => {
  try {
    if (!referenceId) {
      throw new Error("Reference ID is required to get PAN status.");
    }

    const response = await axios.get(`${PAN_URL}/${referenceId}`, {
      headers: {
        "Content-Type": "application/json",
        "x-client-id": clientId,
        "x-client-secret": clientSecret,
        "x-api-version": "2024-01-01",
      },
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      switch (error.response.status) {
        case 400:
          throw new Error("Validation error: " + error.response.data.message);
        case 401:
          throw new Error("Invalid client ID and client secret combination.");
        case 403:
          throw new Error("IP not whitelisted.");
        case 404:
          throw new Error("Incorrect reference ID.");
        case 422:
          throw new Error("Insufficient balance to process the request.");
        case 500:
          throw new Error("Internal server error. Please try again later.");
        default:
          throw new Error("Unknown error occurred: " + error.message);
      }
    } else {
      throw new Error("Request failed: " + error.message);
    }
  }
};

export const verifyGstin = async (GSTIN, businessName) => {
  try {
    const response = await axios.post(
      `${GSTIN_URL}`,
      { GSTIN, businessName },
      {
        headers: {
          "Content-Type": "application/json",
          "x-client-id": clientId,
          "x-client-secret": clientSecret,
          "x-api-version": "2024-01-01",
        },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(`GSTIN Verification failed: ${error.response?.data?.message || error.message}`);
  }
};

export const fetchGstinWithPan = async (pan, verification_id) => {
  try {
    const response = await axios.post(
      `${verificationEndpoint}/pan-gstin`,
      { pan, verification_id },
      {
        headers: {
          "x-client-id": clientId,
          "x-client-secret": clientSecret,
          "accept": "application/json",
          "content-type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(`Error fetching GSTIN with PAN: ${error.response?.data?.message || error.message}`);
  }
};
