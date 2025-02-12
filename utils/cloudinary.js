import { v2 as cloudinary } from "cloudinary";
import fs from "fs"; // file system

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath || !fs.existsSync(localFilePath)) {
      throw new Error("Invalid file path or file does not exist");
    }

    // Upload the file to Cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    console.log("✅ File uploaded successfully:", response.url);

    // Delete the local file
    try {
      fs.unlinkSync(localFilePath);
      console.log("🗑️ File deleted from server successfully.");
    } catch (deleteError) {
      console.error("❌ Error deleting file from server:", deleteError);
    }

    return response;
  } catch (error) {
    console.error("❌ Cloudinary upload failed:", error);

    // Ensure local file is deleted if upload fails
    try {
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
        console.log("🗑️ File deleted from server after failed upload.");
      }
    } catch (deleteError) {
      console.error("❌ Error deleting file after failed upload:", deleteError);
    }

    return null;
  }
};

export { uploadOnCloudinary };
