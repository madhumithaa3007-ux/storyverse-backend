require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function callGemini(prompt, options = {}) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY environment variable. Add it to your backend hosting environment.");
  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const client = new GoogleGenerativeAI(apiKey);
  const generationConfig = {};
  if (Number.isFinite(options.temperature)) generationConfig.temperature = options.temperature;
  if (Number.isFinite(options.maxOutputTokens)) generationConfig.maxOutputTokens = options.maxOutputTokens;
  if (options.responseMimeType) generationConfig.responseMimeType = options.responseMimeType;
  if (options.topP != null) generationConfig.topP = options.topP;
  if (options.topK != null) generationConfig.topK = options.topK;
  const model = client.getGenerativeModel({ model: modelName, ...(Object.keys(generationConfig).length ? { generationConfig } : {}) });
  const result = await model.generateContent(String(prompt || ""));
  const response = result && result.response;
  const text = response && typeof response.text === "function" ? response.text() : "";
  if (!text || !String(text).trim()) throw new Error("Gemini returned an empty response.");
  return String(text).trim();
}

module.exports = { callGemini };
