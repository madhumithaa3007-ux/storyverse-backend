require("dotenv").config();

const { GoogleGenerativeAI } =
require("@google/generative-ai");

const apiKey =
process.env.GEMINI_API_KEY;

if(!apiKey){

throw new Error(
"Missing GEMINI_API_KEY in .env"
);

}

const genAI =
new GoogleGenerativeAI(apiKey);

async function callGemini(prompt, options = {}){

const model =
genAI.getGenerativeModel({
model: options.model || "gemini-3.5-flash"
});

const result =
await model.generateContent({
contents:[
{
role:"user",
parts:[
{
text:prompt
}
]
}
],
generationConfig:{
temperature: options.temperature || 0.8,
maxOutputTokens: options.maxOutputTokens || 700
}
});

return result.response.text();

}

module.exports = {
callGemini
};