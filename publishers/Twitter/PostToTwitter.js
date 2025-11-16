import axios from "axios";
import OAuth from "oauth-1.0a";
import crypto from "crypto";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const oauth = OAuth({
  consumer: {
    key: process.env.CONSUMER_KEY,
    secret: process.env.CONSUMER_SECRET,
  },
  signature_method: "HMAC-SHA1",
  hash_function(baseString, key) {
    return crypto.createHmac("sha1", key).update(baseString).digest("base64");
  },
});

// ✅ Upload image and return media_id
export async function uploadMedia(filePath) {
  const url = "https://upload.twitter.com/1.1/media/upload.json";
  const token = {
    key: process.env.ACCESS_TOKEN,
    secret: process.env.ACCESS_SECRET,
  };

  const fileData = fs.readFileSync(filePath, { encoding: "base64" });

  // ✅ Include media_data in the OAuth signature
  const bodyParams = { media_data: fileData };
  const requestData = { url, method: "POST", data: bodyParams };
  const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

  try {
    const response = await axios.post(
      url,
      new URLSearchParams(bodyParams).toString(),
      {
        headers: {
          Authorization: authHeader.Authorization,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    console.log("✅ Uploaded media:", response.data.media_id_string);
    return response.data.media_id_string;
  } catch (error) {
    console.error(
      "❌ Media upload error:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// ✅ Post tweet with uploaded media
export async function postWithMedia(text, imagePath) {
  console.log("Posting to Twitter")
  console.log(`
    ${text}


    ${imagePath}
    `)
  const mediaId = await uploadMedia(imagePath);
  const url = "https://api.x.com/2/tweets";
  const token = {
    key: process.env.ACCESS_TOKEN,
    secret: process.env.ACCESS_SECRET,
  };

  const requestData = { url, method: "POST" };
  const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

  const payload = {
    text,
    media: { media_ids: [mediaId] },
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: authHeader.Authorization,
        "Content-Type": "application/json",
      },
    });

    console.log("✅ Tweet with image posted!");
    console.log(response.data);
  } catch (error) {
    console.error(
      "❌ Error posting tweet with media:",
      error.response?.data || error.message
    );
    throw error;
  }
}

