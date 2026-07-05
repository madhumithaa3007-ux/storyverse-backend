require("dotenv").config();

const Groq =
require("groq-sdk");

if(
!process.env.GROQ_API_KEY
){

throw new Error(
"Missing GROQ_API_KEY in .env"
);

}

const groq =
new Groq({
apiKey:
process.env.GROQ_API_KEY
});

async function callGroq(
prompt,
options = {}
){

const model =
options.model ||
process.env.GROQ_MODEL ||
"llama-3.3-70b-versatile";

const requestBody = {

model:
model,

messages:[
{
role:"system",
content:
options.system ||
"You are a creative, emotionally intelligent story roleplay model. Avoid repetition. Follow the user's format strictly."
},
{
role:"user",
content:
prompt
}
],

temperature:
options.temperature ?? 0.8,

top_p:
options.top_p ?? 0.9,

max_completion_tokens:
options.maxOutputTokens ||
options.max_completion_tokens ||
700

};

if(
options.responseMimeType ===
"application/json"
){

requestBody.response_format = {
type:"json_object"
};

}

console.log(
"Sending prompt to Groq:",
model
);

const response =
await groq.chat.completions.create(
requestBody
);

return (
response.choices &&
response.choices[0] &&
response.choices[0].message &&
response.choices[0].message.content
)
?
response.choices[0].message.content
:
"";

}

module.exports = {
callGroq
};