import express from "express";
import {
  handleAddBeneficiary,
  handleGetBeneficiary,
  handleRemoveBeneficiary
} from '../controllers/beneficiaryController.js';

const router = express.Router();

// Route for adding a beneficiary
router.post('/add', handleAddBeneficiary);

// Route for getting beneficiary details
router.get('/get', handleGetBeneficiary);

// Route for removing a beneficiary
router.delete('/remove', handleRemoveBeneficiary);

export default router;
