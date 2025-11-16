 
 
 
 import path from "path";
import fs from "fs";

 
 
 
 export async function FileDeleter(filePath){
 
 try {
    const ext = path.extname(filePath).toLowerCase();
    const allowed = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"];

    if (!allowed.includes(ext)) {
      console.warn(`⚠️ Not an image file: ${filePath}`);
      return;
    }

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Image deleted: ${filePath}`);
    } else {
      console.warn(`⚠️ File not found: ${filePath}`);
    }
  } catch (error) {
    console.error("❌ Failed to delete image:", error.message);
  }
}