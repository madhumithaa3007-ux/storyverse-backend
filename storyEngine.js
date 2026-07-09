const { callGemini } =
require("./geminiClient");

async function generateStory(storyData){

const title =
storyData.title || "Untitled Story";

const genre =
storyData.genre || "Drama";

const mood =
storyData.mood || "Emotional";

const theme =
storyData.theme || "Secrets and Lies";

const worldSetting =
storyData.worldSetting || "Modern City";

const romanceType =
storyData.romanceType || "Slow Burn";

const conflictType =
storyData.conflictType || "Hidden Secret";

const storyLength =
storyData.storyLength || "20";

const characterCount =
storyData.characterCount || "auto";

const endingCount =
storyData.endingCount || "3";

const idea =
storyData.idea || "A character enters a life-changing story full of emotion, secrets, and difficult choices.";

const prompt = `

You are StoryVerse AI.

Create content for an interactive story game.

Return ONLY valid JSON.
Do not include markdown.
Do not include explanation outside JSON.
Do not wrap JSON in code blocks.

The user has created a story idea. Your job is to generate:

1. A short story preview
2. A suggested character cast with complete character input data

STORY INPUTS

Story Title:
${title}

Genre:
${genre}

Mood:
${mood}

Theme:
${theme}

World Setting:
${worldSetting}

Romance Type:
${romanceType}

Conflict Type:
${conflictType}

Story Length:
${storyLength} chapters

Requested Character Count:
${characterCount}

Ending Count:
${endingCount}

Story Idea:
${idea}

OUTPUT JSON FORMAT

{
  "storyPreview":"Short story preview here",
  "suggestedCharacters":[
    {
      "name":"Character Name",
      "age":"Age",
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
      "rules":"Short behaviour rules",
      "profile":"Character preview paragraph"
    }
  ],
  "chapterPlan":[
    {
      "chapter":1,
      "title":"Chapter Title",
      "goal":"Main purpose of this chapter",
      "setting":"Main location or atmosphere",
      "keyEvents":[
        "Important event 1",
        "Important event 2",
        "Important event 3"
      ],
      "emotionalFocus":"Main emotion or relationship tension",
      "requiredReveal":"Important clue, truth, danger, or relationship shift that should happen",
      "choiceImpact":"How player choices can change the emotional/mystery/risky route while keeping the base story",
      "cliffhanger":"How this chapter should end"
    }
  ]
}

STORY PREVIEW RULES

- Write the storyPreview in 150 to 220 words.
- It should feel like a story game preview.
- Include emotional hook, main conflict, mystery, romance tension, and setting.
- Do not write Chapter 1.
- Do not reveal the full ending.
- Do not explain every twist.
- Do not make it too long.
- Do not end abruptly.

SUGGESTED CHARACTER RULES

SUGGESTED CHARACTER RULES

- Maximum character limit is 12.
- Never create more than 12 characters.
- Never repeat the same character name in one story.
- Every character in suggestedCharacters must have a unique name.
- If Requested Character Count is a number from 1 to 12, create exactly that many characters.
- If Requested Character Count is auto:
  - Read the Story Idea carefully.
  - If the user mentions a direct count like "10 characters", create exactly 10 characters.
  - If the user mentions role counts like "1 love interest, 1 main character mom, 1 villain", create characters matching those requested roles first.
  - If the story idea does not clearly mention count, create 6 to 8 characters based on story depth.
- If the story idea asks for more than 12 characters, create only the 12 most important characters.
- If the user asks for specific role counts, honor those role counts first.
- Examples:
  - "love interest 1" means create exactly one Love Interest unless the user asks for more.
  - "main character mom 1" means create one Main Character's Mother.
  - "two brothers" means create two brother-type characters if suitable.
  - "6 childhood friends" means create six friend-group characters.
- Must include one Main Character unless the user clearly says otherwise.
- Must include at least one Love Interest if romance type is relevant or requested.
- Include supporting characters useful for drama, mystery, conflict, or emotional development.
- At least one character must have a secret.
- Do not make all characters similar.
- Give each character a useful role in the story.
- Keep character profiles between 70 and 110 words each.

NAME RULES

Use varied names. Do not keep using the same names in every story.

Use names from this name bank when suitable, but do not repeat names inside one story:

Aarav, Aadhya, Arjun, Ananya, Riya, Rohan, Meera, Kabir, Tara, Dev, Isha, Vihaan, Nila, Kavin, Aanya, Reyansh, Diya, Varun, Priya, Nikhil, Kavya, Akash, Sanjana, Aditya, Ishaan, Neha, Maya, Aryan, Zoya, Aria, Kiara, Karthik, Shravan, Mira, Leela, Amara, Elena, Elias, Noah, Liam, Ava, Sophia, Ethan, Lucas, Olivia, Emma, Daniel, Clara, Julian, Iris, Adrian, Serena, Nathan, Aurora, Ezra, Luna, Felix, Freya, Theo, Isla, Cassian, Celeste, Rowan, Maeve, Soren, Lyra, Rafael, Valeria, Milo, Daphne, Zane, Alina, Cyrus, Elara, Ronan, Selene, Matteo, Liora, Luca, Nadia, Dante, Evie, Jasper, Mirae, Hana, Kai, Yuna, Minho, Sora, Jisoo, Ren, Aiko, Haru, Mei, Kenji, Ayla, Samir, Laila, Omar, Noor, Zain, Yasmin.

- Choose names that fit the genre, culture, and setting.
- Do not use placeholder names like Character 1 unless absolutely necessary.

USE ONLY THESE ROLE OPTIONS WHEN POSSIBLE

Main Character,
Love Interest,
Best Friend,
Main Character's Mother,
Main Character's Father,
Main Character's Brother,
Main Character's Sister,
Main Character's Cousin,
Main Character's Childhood Friend,
Main Character's Mentor,
Main Character's Boss,
Main Character's Ex,
Love Interest's Mother,
Love Interest's Father,
Love Interest's Brother,
Love Interest's Sister,
Love Interest's Best Friend,
Love Interest's Ex,
Rival,
Villain,
Guardian,
Teacher,
Colleague,
Detective,
Mystery Stranger

USE ONLY THESE SPEECH STYLE OPTIONS WHEN POSSIBLE

Formal,
Casual,
Polite,
Friendly,
Professional,
Confident,
Calm,
Gentle,
Cheerful,
Playful,
Flirtatious,
Sarcastic,
Teasing,
Blunt,
Direct,
Reserved,
Shy,
Mysterious,
Elegant,
Charming,
Witty,
Passionate,
Emotional,
Protective,
Authoritative

USE ONLY THESE RELATIONSHIP STYLE OPTIONS WHEN POSSIBLE

Friendly,
Romantic,
Reserved,
Tsundere,
Protective,
Supportive,
Affectionate,
Loyal,
Trusting,
Independent,
Shy,
Playful,
Flirtatious,
Possessive,
Jealous,
Suspicious,
Guarded,
Manipulative,
Competitive,
Devoted,
Forgiving,
Emotionally Distant,
Protective Mentor,
Secret Admirer,
Childhood Companion,
Rival Turned Ally,
Obsessively Attached,
Teasing,
Respectful,
Dependable

USE ONLY THESE SECRET TYPE OPTIONS WHEN POSSIBLE

Family Secret,
Identity Secret,
Love Secret,
Hidden Past,
Medical Secret,
Criminal Secret,
Corporate Secret,
Government Secret,
Supernatural Secret,
Lost Heir Secret,
Double Life Secret,
Hidden Relationship,
Blackmail Secret,
Forbidden Power,
Secret Child,
Unknown Parentage,
Memory Loss Secret,
Witness Protection,
Revenge Secret,
Inheritance Secret,
Hidden Wealth,
Secret Organization,
Former Criminal,
Secret Marriage,
False Identity,
Buried Evidence,
Hidden Sibling,
Secret Mission,
Murder Witness,
Royal Bloodline

CHAPTER PLAN RULES

- Create exactly ${storyLength} chapterPlan objects.
- The chapterPlan must cover the full story from beginning to ending.
- Each chapter must feel connected to the previous chapter.
- Each chapter must have a clear story goal.
- Each chapter must include 3 to 5 keyEvents.
- Each chapter must include one requiredReveal.
- Each chapter must include one cliffhanger.
- The story should feel pre-planned, not random.
- Choices may change emotional route, relationship route, mystery route, or risky route.
- But the base story route must remain consistent.
- Do not resolve the main conflict too early.
- Chapter 1 should introduce the setup, characters, and first major hook.
- Middle chapters should develop secrets, romance, mystery, betrayal, danger, or emotional conflict.
- Final chapters should build toward endings based on choices.
- Keep each chapterPlan object concise but specific.

IMPORTANT

Return JSON only.
The JSON must be valid.
The suggestedCharacters value must be an array.
The chapterPlan value must be an array.

`;

const aiText =
await callGemini(
prompt,
{
temperature:0.8,
responseMimeType:"application/json",
maxOutputTokens:6000
}
);

try{

let cleaned =
aiText
.replace(/```json/g,"")
.replace(/```/g,"")
.trim();

const firstBrace =
cleaned.indexOf("{");

const lastBrace =
cleaned.lastIndexOf("}");

if(
firstBrace !== -1 &&
lastBrace !== -1
){

cleaned =
cleaned.substring(
firstBrace,
lastBrace + 1
);

}

const parsed =
JSON.parse(cleaned);

const suggestedCharacters =
normalizeSuggestedCharacters(
parsed.suggestedCharacters,
characterCount,
idea
);

const chapterPlan =
Array.isArray(parsed.chapterPlan)
?
parsed.chapterPlan.slice(
0,
parseInt(storyLength) || 20
)
:
[];

return {

storyPreview:
parsed.storyPreview || "",

suggestedCharacters:
suggestedCharacters,

chapterPlan:
chapterPlan

};

}

catch(error){

console.error(
"Story JSON Parse Error:"
);

console.error(error);

console.error(
"Raw AI Response:"
);

console.error(aiText);

return {

storyPreview:
aiText,

suggestedCharacters:
[],

chapterPlan:
[]

};

}

}

function getTargetCharacterLimit(characterCount){

const raw =
String(characterCount || "auto")
.toLowerCase()
.trim();

if(raw === "auto"){

return 12;

}

const parsed =
parseInt(raw);

if(isNaN(parsed)){

return 12;

}

return Math.max(
1,
Math.min(
12,
parsed
)
);

}

function normalizeSuggestedCharacters(
characters,
characterCount,
idea
){

const nameBank = [
"Aarav","Aadhya","Arjun","Ananya","Riya","Rohan","Meera","Kabir","Tara","Dev",
"Isha","Vihaan","Nila","Kavin","Aanya","Reyansh","Diya","Varun","Priya","Nikhil",
"Kavya","Akash","Sanjana","Aditya","Ishaan","Neha","Maya","Aryan","Zoya","Aria",
"Kiara","Karthik","Shravan","Mira","Leela","Amara","Elena","Elias","Noah","Liam",
"Ava","Sophia","Ethan","Lucas","Olivia","Emma","Daniel","Clara","Julian","Iris",
"Adrian","Serena","Nathan","Aurora","Ezra","Luna","Felix","Freya","Theo","Isla",
"Cassian","Celeste","Rowan","Maeve","Soren","Lyra","Rafael","Valeria","Milo","Daphne",
"Zane","Alina","Cyrus","Elara","Ronan","Selene","Matteo","Liora","Luca","Nadia",
"Dante","Evie","Jasper","Hana","Kai","Yuna","Minho","Sora","Ren","Aiko",
"Haru","Mei","Kenji","Ayla","Samir","Laila","Omar","Noor","Zain","Yasmin"
];

if(!Array.isArray(characters)){

return [];

}

const limit =
getTargetCharacterLimit(
characterCount
);

const usedNames =
new Set();

const cleaned =
characters
.slice(0,limit)
.map((character,index)=>{

const safeCharacter =
character || {};

let name =
String(
safeCharacter.name ||
""
).trim();

if(
!name ||
usedNames.has(
name.toLowerCase()
)
){

name =
nameBank.find(bankName=>{

return !usedNames.has(
bankName.toLowerCase()
);

}) ||
"Character " + (index + 1);

}

usedNames.add(
name.toLowerCase()
);

return {

...safeCharacter,

name:
name

};

});

return cleaned;

}

module.exports = {
generateStory
};