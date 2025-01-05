import express from "express";
import {
  handleVerifyBankAccount,
  handleGetBavStatus,
  handleVerifyUPI,
  handleGetUPIVerificationStatus,
  handleVerifyPAN,
  handleGetPANStatus,
  handleVerifyGstin,
  handleFetchGstinWithPan
} from "../controllers/bankAccountVerificationController.js";

const router = express.Router();

router.post("/verify-bank", handleVerifyBankAccount);
router.get("/verify-bank-status", handleGetBavStatus);
router.post("/verify-upi", handleVerifyUPI);
router.get("/verify-upi-status", handleGetUPIVerificationStatus);
router.post("/verify-pan", handleVerifyPAN);
router.get("/verify-pan-status/:referenceId", handleGetPANStatus);
router.post('/verify-gstin', handleVerifyGstin);
router.post('/fetch-gstin', handleFetchGstinWithPan);

export default router;
