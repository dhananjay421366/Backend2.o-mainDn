import CryptoJs from "crypto-js";
import db from '../config.js';

export const encrypt = async (data)=>{
    console.log("data",data)
     var ciphertext = CryptoJs.AES.encrypt(JSON.stringify(data), aliceSecretkey).toString();
     console.log("encrypted_ciphertext",ciphertext)
    return ciphertext
  }

export const dcrypt = async(req,res)=>{
   console.log("req.body",req.body.settlement_id)
   const {settlement_id}=req.body
   try{
     const data=await db.query("select * from settlement where settlement_id = ($1)",[settlement_id])
     console.log(data.rows[0])
     var bytes  = CryptoJs.AES.decrypt(data.rows[0].settlement_data, bobSecretkey);
     var decryptedData = JSON.parse(bytes.toString(CryptoJs.enc.Utf8));
     console.log("decryptData",decryptedData) 
     res.status(200).json(decryptedData)
   }catch(err){
     res.status(400).json({ error: err });
   }
 }

 