const { callGemini } =
require("./geminiClient");

const NAME_BANK = [
"Aarav","Aadhya","Arjun","Ananya","Riya","Rohan","Meera","Kabir","Tara","Dev",
"Isha","Vihaan","Nila","Kavin","Aanya","Reyansh","Diya","Varun","Priya","Nikhil",
"Kavya","Akash","Sanjana","Aditya","Ishaan","Neha","Maya","Aryan","Zoya","Aria",
"Kiara","Karthik","Shravan","Mira","Leela","Amara","Elena","Elias","Noah","Liam",
"Ava","Sophia","Ethan","Lucas","Olivia","Emma","Daniel","Clara","Julian","Iris",
"Adrian","Serena","Nathan","Aurora","Ezra","Luna","Felix","Freya","Theo","Isla",
"Cassian","Celeste","Rowan","Maeve","Soren","Lyra","Rafael","Valeria","Milo",
"Daphne","Zane","Alina","Cyrus","Elara","Ronan","Selene","Matteo","Liora","Luca",
"Nadia","Dante","Evie","Jasper","Hana","Kai","Yuna","Minho","Sora","Ren","Aiko",
"Haru","Mei","Kenji","Ayla","Samir","Laila","Omar","Noor","Zain","Yasmin"
];

function clampCount(value, fallback = 6){

const parsed =
parseInt(value);

if(Number.isNaN(parsed)){

return fallback;

}

return Math.max(
1,
Math.min(
12,
parsed
)
);

}

function getRequestedTotal(
story,
requestedCount,
existingCount
){

if(
requestedCount !== undefined &&
requestedCount !== null &&
String(requestedCount).toLowerCase() !== "auto"
){

return clampCount(
requestedCount
);

}

const savedCount =
story &&
story.characterCount;

if(
savedCount &&
String(savedCount).toLowerCase() !== "auto"
){

return clampCount(
savedCount
);

}

const idea =
String(
story &&
(
story.description ||
story.idea ||
story.story
)
||
""
);

const directCountMatch =
idea.match(
/\b(?:create|include|have|with)?\s*(\d{1,2})\s+characters?\b/i
);

if(directCountMatch){

return clampCount(
directCountMatch[1]
);

}

return Math.max(
6,
existingCount
);

}

function cleanJsonText(aiText){

let cleaned =
String(aiText || "")
.replace(/```json/gi,"")
.replace(/```/g,"")
.trim();

const firstBracket =
cleaned.indexOf("[");

const firstBrace =
cleaned.indexOf("{");

let startIndex = -1;

if(
firstBracket !== -1 &&
firstBrace !== -1
){

startIndex =
Math.min(
firstBracket,
firstBrace
);

}
else{

startIndex =
Math.max(
firstBracket,
firstBrace
);

}

const lastBracket =
cleaned.lastIndexOf("]");

const lastBrace =
cleaned.lastIndexOf("}");

const endIndex =
Math.max(
lastBracket,
lastBrace
);

if(
startIndex !== -1 &&
endIndex > startIndex
){

cleaned =
cleaned.substring(
startIndex,
endIndex + 1
);

}

return cleaned;

}

function normalizeCharacters(
characters,
existingCharacters,
maximumCount
){

if(!Array.isArray(characters)){

return [];

}

const existingNames =
new Set(
(existingCharacters || [])
.map(character=>
String(character.name || "")
.trim()
.toLowerCase()
)
.filter(Boolean)
);

const usedNames =
new Set(
existingNames
);

return characters
.map((character,index)=>{

const safeCharacter =
character || {};

let name =
String(
safeCharacter.name || ""
).trim();

if(
!name ||
usedNames.has(
name.toLowerCase()
)
){

name =
NAME_BANK.find(candidate=>{

return !usedNames.has(
candidate.toLowerCase()
);

}) ||
"Character " + (index + 1);

}

usedNames.add(
name.toLowerCase()
);

return {

characterId:
safeCharacter.characterId ||
"char_" + Date.now() + "_" + index,

name:
name,

age:
String(
safeCharacter.age || "25"
),

gender:
safeCharacter.gender || "Other",

occupation:
safeCharacter.occupation || "Unknown",

role:
safeCharacter.role || "Supporting Character",

traits:
safeCharacter.traits || "Observant, Emotional, Determined",

speechStyle:
safeCharacter.speechStyle || "Casual",

relationshipStyle:
safeCharacter.relationshipStyle || "Friendly",

strengths:
safeCharacter.strengths || "",

weaknesses:
safeCharacter.weaknesses || "",

likes:
safeCharacter.likes || "",

dislikes:
safeCharacter.dislikes || "",

hobbies:
safeCharacter.hobbies || "",

fears:
safeCharacter.fears || "",

secretType:
safeCharacter.secretType || "Hidden Past",

rules:
safeCharacter.rules || "",

profile:
safeCharacter.profile || "",

avatarImage:
safeCharacter.avatarImage || "",

relationship:{
trust:50,
friendship:50,
romance:0,
suspicion:0
}

};

})
.slice(
0,
maximumCount
);

}

async function generateStoryCharacters(input){

const story =
input.story || {};

const existingCharacters =
Array.isArray(input.existingCharacters)
?
input.existingCharacters
:
[];

const requestedTotal =
getRequestedTotal(
story,
input.characterCount,
existingCharacters.length
);

const availableSlots =
Math.max(
0,
12 - existingCharacters.length
);

const remainingRequired =
Math.max(
0,
requestedTotal - existingCharacters.length
);

const generationCount =
Math.min(
availableSlots,
remainingRequired
);

if(generationCount === 0){

return {

characters:[],

requestedTotal:
requestedTotal,

message:
existingCharacters.length >= 12
?
"Maximum character limit reached."
:
"No additional characters are required."

};

}

const existingSummary =
existingCharacters.map(character=>({

name:
character.name,

role:
character.role,

gender:
character.gender,

occupation:
character.occupation

}));

const prompt = `

You are StoryVerse AI.

Generate only the missing character cast for an interactive story.

Return ONLY valid JSON.
Do not use markdown.
Do not wrap the response in code fences.

STORY DETAILS

Title:
${story.title || "Untitled Story"}

Genre:
${story.genre || "Drama"}

Story Preview:
${story.story || ""}

Original Story Idea:
${story.description || story.idea || ""}

Mood:
${story.mood || ""}

Theme:
${story.theme || ""}

World Setting:
${story.worldSetting || ""}

Romance Type:
${story.romanceType || ""}

Conflict Type:
${story.conflictType || ""}

REQUESTED TOTAL CHARACTER COUNT

${requestedTotal}

EXISTING CHARACTERS

${JSON.stringify(existingSummary)}

NUMBER OF NEW CHARACTERS TO GENERATE

${generationCount}

OUTPUT FORMAT

{
  "characters":[
    {
      "name":"Unique character name",
      "age":"25",
      "gender":"Male/Female/Other",
      "occupation":"Occupation",
      "role":"Role in Story",
      "traits":"Trait 1, Trait 2, Trait 3",
      "speechStyle":"Speech Style",
      "relationshipStyle":"Relationship Style",
      "strengths":"Strength 1, Strength 2, Strength 3",
      "weaknesses":"Weakness 1, Weakness 2, Weakness 3",
      "likes":"Like 1, Like 2, Like 3",
      "dislikes":"Dislike 1, Dislike 2, Dislike 3",
      "hobbies":"Hobby 1, Hobby 2",
      "fears":"Fear 1, Fear 2",
      "secretType":"Secret Type",
      "rules":"Brief character behaviour rules",
      "profile":"A concise 6 to 8 sentence character preview"
    }
  ]
}

RULES

- Create exactly ${generationCount} new characters.
- Never create more than 12 total story characters.
- Do not repeat any existing character name.
- Do not repeat a name inside the generated list.
- Study the story idea for requested roles and counts.
- If the idea says "1 love interest", create only one Love Interest in total.
- If the idea says "main character mom 1", include one Main Character's Mother in total.
- If the idea asks for two siblings, six friends, one villain, or similar counts, honour them.
- Check existing characters before creating a role that may already be filled.
- Include one Main Character if the existing cast does not have one.
- Include a Love Interest when romance is relevant and one does not already exist.
- Every character must have a useful and distinct story function.
- Character profiles must be concise: 6 to 8 sentences.
- Names must suit the story's culture, genre, and setting.

Return valid JSON only.

`;

const aiText =
await callGemini(
prompt,
{
temperature:0.75,
responseMimeType:"application/json",
maxOutputTokens:3500
}
);

let parsed;

try{

parsed =
JSON.parse(
cleanJsonText(aiText)
);

}
catch(error){

console.error(
"Character suggestion JSON parse error:"
);

console.error(error);

console.error(
"Raw character suggestion response:"
);

console.error(aiText);

throw new Error(
"AI returned an incomplete character response. Please try Generate Characters again."
);

}

const rawCharacters =
Array.isArray(parsed)
?
parsed
:
(
Array.isArray(parsed.characters)
?
parsed.characters
:
[]
);

const characters =
normalizeCharacters(
rawCharacters,
existingCharacters,
generationCount
);

if(characters.length === 0){

throw new Error(
"No characters were generated. Please try again."
);

}

return {

characters:
characters,

requestedTotal:
requestedTotal,

generatedCount:
characters.length

};

}

module.exports = {
generateStoryCharacters
};