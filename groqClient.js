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
"llama-3.1-8b-instant";

const requestBody = {

model:
model,

messages:[
{
role:"user",
content:prompt
}
],

temperature:
options.temperature ?? 0.75,

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