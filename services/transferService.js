import axios from 'axios';
import { cashfree } from '../config2.js';

const { clientId, clientSecret, payoutEndpoint } = cashfree;
const URL = `${payoutEndpoint}/transfers`;

// Function to initiate a transfer
export const initiateTransfer = async (transferData) => {
  try {
    // Make the API call to initiate the transfer
    const response = await axios.post(
      URL,
      transferData,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-version': '2024-01-01',
          'x-client-id': clientId, // Client ID from .env
          'x-client-secret': clientSecret, // Client Secret from .env
        },
      }
    );

    // Return the response data
    return response.data;
  } catch (error) {
    console.error(error);

    // Handle errors by throwing a descriptive error message
    throw new Error(
      `Transfer initiation failed: ${error.response?.data?.message || error.message}`
    );
  }
};

// Function to get the status of a transfer
export const getTransferStatus = async (queryParams) => {
  try {
    // Make the GET request to get the transfer status
    const response = await axios.get(URL, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2024-01-01',
        'x-client-id': clientId, // Client ID
        'x-client-secret': clientSecret, // Client Secret
      },
      params: queryParams, // Pass the query parameters (cf_transfer_id or transfer_id)
    });

    // Return the response data
    return response.data;
  } catch (error) {
    console.error(error);

    // Handle errors by throwing a descriptive error message
    throw new Error(
      `Failed to get transfer status: ${error.response?.data?.message || error.message}`
    );
  }
};
