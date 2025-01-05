import { addBeneficiary, getBeneficiary, removeBeneficiary } from "../services/beneficiaryService.js";


export const handleAddBeneficiary = async (req, res) => {
  try {
    const beneficiaryData = req.body;
    const result = await addBeneficiary(beneficiaryData);
    res.status(201).json(result); // Return 201 Created on success
  } catch (error) {
    res.status(500).json({ message: error.response?.data?.message || error.message });
  }
};

export const handleGetBeneficiary = async (req, res) => {
  try {
    const { beneficiary_id, bank_account_number, bank_ifsc } = req.query; // Get params from query string
    const result = await getBeneficiary({
      beneficiary_id,
      bank_account_number,
      bank_ifsc,
    });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.response?.data?.message || error.message });
  }
};

// Controller method to remove a beneficiary
export const handleRemoveBeneficiary = async (req, res) => {
  try {
    const { beneficiary_id } = req.query; // Get beneficiary_id from query string
    const result = await removeBeneficiary(beneficiary_id);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.response?.data?.message || error.message });
  }
};
