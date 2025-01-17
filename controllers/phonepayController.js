// PhonePe Controller
import dotenv from 'dotenv';
import uniqid from 'uniqid';
dotenv.config();
export const PhonePay = async (req, res) => {
    try {
      const { amount } = req.body;
  
      if (!amount) {
        return res.status(400).json({ success: false, message: "Amount is required." });
      }
  
      const userId = "MUID123";
      const merchantTransactionId = uniqid();
  
      const normalPayLoad = {
        merchantId: process.env.MERCHANT_ID,
        merchantTransactionId,
        merchantUserId: userId,
        amount: amount * 100,
        redirectUrl: `${APP_BE_URL}/payment/validate/${merchantTransactionId}`,
        redirectMode: "REDIRECT",
        mobileNumber: "9999999999",
        paymentInstrument: {
          type: "PAY_PAGE",
        },
      };
  
      const base64EncodedPayload = Buffer.from(JSON.stringify(normalPayLoad), "utf8").toString("base64");
      const stringToHash = base64EncodedPayload + "/pg/v1/pay" + SALT_KEY;
      const sha256_val = sha256(stringToHash);
      const xVerifyChecksum = sha256_val + "###" + SALT_INDEX;
  
      const response = await axios.post(`${PHONE_PE_HOST_URL}/pg/v1/pay`,
        { request: base64EncodedPayload },
        {
          headers: {
            "Content-Type": "application/json",
            "X-VERIFY": xVerifyChecksum,
            accept: "application/json",
          },
        }
      );
  
      if (response.data?.data?.instrumentResponse) {
        res.status(200).json({
          success: true,
          data: { redirectUrl: response.data.data.instrumentResponse.redirectInfo.url },
          message: "Payment initiated successfully."
        });
      } else {
        res.status(400).json({ success: false, message: "Payment initiation failed." });
      }
    } catch (error) {
      console.error("Payment initiation error:", error.response?.data || error.message);
      res.status(500).json({ success: false, message: error.response?.data || error.message });
    }
  };
  
  // Payment Status
  export const PaymentStatus = async (req, res) => {
    try {
      const { merchantTransactionId } = req.params;
  
      if (!merchantTransactionId) {
        return res.status(400).json({ success: false, message: "Merchant Transaction ID is required" });
      }
  
      const statusUrl = `${PHONE_PE_HOST_URL}/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}`;
      const stringToHash = `/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}` + SALT_KEY;
      const sha256_val = sha256(stringToHash);
      const xVerifyChecksum = sha256_val + "###" + SALT_INDEX;
  
      const response = await axios.get(statusUrl, {
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": xVerifyChecksum,
          "X-MERCHANT-ID": MERCHANT_ID,
          accept: "application/json",
        },
      });
  
      if (response.data?.code === "PAYMENT_SUCCESS") {
        res.status(200).json({
          success: true,
          data: response.data,
          message: "Payment successful."
        });
      } else {
        res.status(400).json({
          success: false,
          message: `Payment not successful. Status: ${response.data.code}`
        });
      }
    } catch (error) {
      console.error("Payment status check error:", error.response?.data || error.message);
      res.status(500).json({ success: false, message: error.response?.data || error.message });
    }
  };