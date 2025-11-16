import fs from "fs";
import path from "path";
import axios from "axios";

/**
 * Downloads an image from a URL and saves it inside ./downloads with the given filename.
 * The image retains its original extension.
 *
 * @param {string} url - The image URL.
 * @param {string} filename - The base name (without extension) for the saved image.
 * @returns {Promise<string>} - The full path where the image was saved.
 */
export async function ImageDownloader(url, filename) {
  const folderPath = path.resolve("./lib/ImageUtils/image_downloads");

  try {
    // Ensure folder exists
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    // Fetch the image
    const response = await axios({
      url,
      method: "GET",
      responseType: "stream",
    });

    // Try to get the extension from the URL first
    let ext = path.extname(new URL(url).pathname);

    // If the URL doesn’t contain an extension, try the content-type header
    if (!ext && response.headers["content-type"]) {
      const mime = response.headers["content-type"];
      const mimeToExt = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/gif": ".gif",
        "image/webp": ".webp",
        "image/bmp": ".bmp",
      };
      ext = mimeToExt[mime] || "";
    }

    // Construct the full save path with the retained extension
    const fileFullPath = path.join(folderPath, `${filename}${ext}`);

    // Save image
    const writer = fs.createWriteStream(fileFullPath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    console.log(`✅ Image saved as: ${fileFullPath}`);
    return fileFullPath;
  } catch (error) {
    console.error("❌ Failed to download image:", error.message);
    throw error;
  }
}
