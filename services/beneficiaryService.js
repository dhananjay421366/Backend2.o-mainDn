import axios from "axios";
import { cashfree } from "../config2.js";

const { clientId, clientSecret, payoutEndpoint } = cashfree;

const URL = `${payoutEndpoint}/beneficiary`; // Sandbox URL

export const addBeneficiary = async (beneficiaryData) => {
  try {
    const response = await axios.post(
      URL,
      beneficiaryData,
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-version": "2024-01-01", // API version
          "x-client-id": clientId, // Client ID from .env
          "x-client-secret": clientSecret, // Client Secret from .env
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(error);
    throw new Error(`Add beneficiary failed: ${error.response?.data?.message}`);
  }
};

export const getBeneficiary = async (params) => {
  try {
    const { beneficiary_id, bank_account_number, bank_ifsc } = params;

    // Ensure at least one identification method is provided
    if (!beneficiary_id && (!bank_account_number || !bank_ifsc)) {
      throw new Error(
        "Provide either beneficiary_id or both bank_account_number and bank_ifsc."
      );
    }

    const queryParams = {};
    if (beneficiary_id) queryParams.beneficiary_id = beneficiary_id;
    if (bank_account_number && bank_ifsc) {
      queryParams.bank_account_number = bank_account_number;
      queryParams.bank_ifsc = bank_ifsc;
    }

    const response = await axios.get(URL, {
      params: queryParams,
      headers: {
        "Content-Type": "application/json",
        "x-client-id": clientId,
        "x-client-secret": clientSecret,
        "x-api-version": "2024-01-01", // API version
      },
    });

    return response.data;
  } catch (error) {
    console.error(error);
    throw new Error(
      `Failed to get beneficiary details: ${error.response?.data?.message}`
    );
  }
};

export const removeBeneficiary = async (beneficiary_id) => {
  try {
    if (!beneficiary_id) {
      throw new Error("Beneficiary ID is required to remove a beneficiary.");
    }

    const response = await axios.delete(URL, {
      params: { beneficiary_id },
      headers: {
        "Content-Type": "application/json",
        "x-client-id": clientId,
        "x-client-secret": clientSecret,
        "x-api-version": "2024-01-01", // API version
      },
    });

    return response.data;
  } catch (error) {
    console.error(error);
    throw new Error(
      `Failed to remove beneficiary: ${error.response?.data?.message}`
    );
  }
};
