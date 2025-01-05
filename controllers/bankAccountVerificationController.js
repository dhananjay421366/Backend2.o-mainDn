import  {
  verifyBankAccount,
  getBavStatus,
  verifyUPI,
  getUPIVerificationStatus,
  verifyPAN,
  getPANStatus,
  verifyGstin,
  fetchGstinWithPan
} from "../services/bankAccountVerificationService.js";
import { encrypt } from "../services/encrypt_and_dcryptService.js";
//verifing bank account of organiser
export const handleVerifyBankAccount = async (req, res) => {
  const { bank_account, ifsc, name, user_id, phone } = req.body;

  try {
    const verificationResponse = await verifyBankAccount(
      bank_account,
      ifsc,
      name,
      user_id,
      phone
    );
    encrypt(verificationResponse)
    //store in data base
    res.status(200).json(verificationResponse);
  } catch (error) {
    res.status(500).json({ message: error.response?.data?.message || error.message });
  }
};

export const handleGetBavStatus = async (req, res) => {
  const { reference_id, user_id } = req.query;

  try {
    if (!reference_id && !user_id) {
      return res.status(400).json({ message: "Please provide reference_id or user_id" });
    }

    const statusResponse = await getBavStatus(reference_id, user_id);
    res.status(200).json(statusResponse);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.response?.data?.message || error.message });
  }
};

export const handleVerifyUPI = async (req, res) => {
  const verificationData = req.body;

  try {
    const result = await verifyUPI(verificationData);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.response?.data?.message || error.message });
  }
};

export const handleGetUPIVerificationStatus = async (req, res) => {
  const { verification_id, reference_id } = req.query;

  try {
    const result = await getUPIVerificationStatus({ verification_id, reference_id });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.response?.data?.message || error.message });
  }
};

export const handleVerifyPAN = async (req, res) => {
  const { pan, name } = req.body;

  try {
    const result = await verifyPAN(pan, name);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.response?.data?.message || error.message });
  }
};

export const handleGetPANStatus = async (req, res) => {
  const { referenceId } = req.params;

  try {
    const result = await getPANStatus(referenceId);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.response?.data?.message || error.message });
  }
};

export const handleVerifyGstin = async (req, res) => {
  const { GSTIN, businessName } = req.body;

  if (!GSTIN || !businessName) {
    return res.status(400).json({ error: 'GSTIN and businessName are required.' });
  }

  try {
    const result = await verifyGstin(GSTIN, businessName);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.response?.data?.message || 'An error occurred while verifying the GSTIN.' });
  }
};

export const handleFetchGstinWithPan = async (req, res) => {
  const { pan, verification_id } = req.body;

  try {
    const data = await fetchGstinWithPan(pan, verification_id);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.response?.data?.message || error.message });
  }
};
