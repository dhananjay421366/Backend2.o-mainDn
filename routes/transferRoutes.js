import express from "express";
import { handleInitiateTransfer, handleGetTransferStatus } from "../controllers/transferController.js";

const router = express.Router();

// Route to initiate a transfer
router.post("/requestTransfer", handleInitiateTransfer);

// Route to get the transfer status
router.get("/status", handleGetTransferStatus);

export default router;
