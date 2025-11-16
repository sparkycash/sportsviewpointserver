import dotenv from "dotenv";
import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAllApiKeys } from "../lib/Database/dbFunctions.js";

import { SiBlogPrompt } from "./Prompts/SiBlogPrompts.js";

dotenv.config();


export async function SiBlogReWriter(blogContent, category) {
  const API_KEYS = await getAllApiKeys();

  if (!blogContent) {
    console.log("⚠️ No blog content provided.");
    return { success: false, answer: null };
  }

  if (!API_KEYS.length) {
    console.error("🚫 No API keys found in the database.");
    return { success: false, answer: null };
  }

  const MAX_RETRIES = 4;
  const OPENROUTER_MODEL = "deepseek/deepseek-r1-0528:free";
  const GEMINI_MODEL = "gemini-2.5-flash";

  const prompt = SiBlogPrompt(category.category_name)
  
  // === Loop through all stored API keys ===
  for (let keyIndex = 0; keyIndex < API_KEYS.length; keyIndex++) {
    const keyObj = API_KEYS[keyIndex];
    const currentKey = keyObj.api_key;
    const source = (keyObj.api_source || "").toLowerCase();

    if (!currentKey) {
      console.warn(`⚠️ Skipping empty API key at index ${keyIndex}`);
      continue;
    }

    console.log(`🔑 Using API key #${keyIndex + 1}/${API_KEYS.length} [${source || "unknown source"}]`);

    // === Provider-specific logic ===
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`🚀 Attempt ${attempt}/${MAX_RETRIES} with key #${keyIndex + 1}`);

        let answer;

        if (source === "open router") {
          // ================= OPENROUTER CALL =================
          const response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
              model: OPENROUTER_MODEL,
              messages: [
                { role: "system", content: prompt },
                { role: "user", content: blogContent },
              ],
              temperature: 0.7,
            },
            {
              headers: {
                Authorization: `Bearer ${currentKey}`,
                "Content-Type": "application/json",
              },
              timeout: 60000,
            }
          );

          answer = response?.data?.choices?.[0]?.message?.content?.trim();

        } else if (source === "gemini") {
          // ================= GEMINI CALL =================
          const genAI = new GoogleGenerativeAI(currentKey);
          const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

          const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: `${prompt}\n\n${blogContent}` }] }],
          });

          answer = result?.response?.text()?.trim();

        } else {
          console.warn(`⚠️ Unknown API source '${source}' at index ${keyIndex}, skipping...`);
          break;
        }

        if (!answer) throw new Error("Empty response received from model.");

        console.log(`✅ Successful response from ${source.toUpperCase()} API`);
        return { success: true, answer };

      } catch (err) {
        const errorMessage =
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          err.message ||
          "Unknown error";

        const statusCode = err.response?.status;
        console.error(`❌ Attempt ${attempt} failed [${source}]: ${errorMessage}`);

        // Handle rate limiting
        if (statusCode === 429 || /rate.?limit/i.test(errorMessage)) {
          console.warn(`⚠️ Rate limit hit for key #${keyIndex + 1}. Switching to next key...`);
          break;
        }

        // Retry with exponential backoff
        if (attempt < MAX_RETRIES) {
          const waitTime = Math.pow(2, attempt - 1) * 1000;
          console.log(`⏳ Retrying in ${waitTime / 1000}s...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        } else {
          console.warn(`⚠️ Max retries reached for key #${keyIndex + 1}. Moving to next...`);
        }
      }
    }
  }

  console.error("🚫 All API keys exhausted. No successful response.");
  return { success: false, answer: null };
}
