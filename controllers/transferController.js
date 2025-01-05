import { initiateTransfer, getTransferStatus } from "../services/transferService.js";


// Controller function to initiate a transfer
export const handleInitiateTransfer = async (req, res) => {
  try {
    const transferData = req.body;
    const result = await initiateTransfer(transferData);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.response?.data?.message || error.message });
  }
};

export const handleGetTransferStatus = async (req, res) => {
  try {
    const queryParams = req.query;
    console.log(queryParams);

    const result = await getTransferStatus(queryParams);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.response?.data?.message || error.message });
  }
};
