const { callGemini } =
require("./geminiClient");

async function playChapter(data){

const {

story,
characters,
playerCharacter,
currentChapter,
chapterLimit,
chapterInteractionCount,
chapterMilestones,
importantChoices,
action,
storyMemory

} = data;

const milestones =
chapterMilestones || [
5,
25,
45,
65,
85,
95
];

let chapterMode =
"normal";

if(
milestones.includes(
chapterInteractionCount
)
){

chapterMode =
"milestone_choice";

}

if(
chapterInteractionCount >= 96 &&
chapterInteractionCount <= 99
){

chapterMode =
"cliffhanger_build";

}

if(
chapterInteractionCount >= 100
){

chapterMode =
"chapter_finale";

}

const prompt = `

You are StoryVerse AI.

STORY SUMMARY

${story.story}

CURRENT CHAPTER

${currentChapter}

CHAPTER LIMIT

${chapterLimit}

CURRENT INTERACTION COUNT

${chapterInteractionCount} / 100

CURRENT CHAPTER MODE

${chapterMode}

PLAYER CHARACTER

Name:
${playerCharacter.name}

Role:
${playerCharacter.role}

Occupation:
${playerCharacter.occupation}

Traits:
${playerCharacter.traits}

Speech Style:
${playerCharacter.speechStyle}

Relationship Style:
${playerCharacter.relationshipStyle}

Strengths:
${playerCharacter.strengths}

Weaknesses:
${playerCharacter.weaknesses}

Fears:
${playerCharacter.fears}

Secret Type:
${playerCharacter.secretType}

Profile:
${playerCharacter.profile}

Persona Rules:
${playerCharacter.rules || ""}

Persona Triggers:
${playerCharacter.triggers || ""}

IMPORTANT PLAYER RULE

The player controls:

${playerCharacter.name}

Never generate dialogue,
thoughts,
actions,
or decisions
for ${playerCharacter.name}.

Only generate:

- Narration
- Other character dialogue

The player character may appear in narration,
but may never speak.

ALL STORY CHARACTERS

${characters
.filter(
character =>
character.name !== playerCharacter.name
)
.map(character =>
`
Name: ${character.name}
Role: ${character.role}
Occupation: ${character.occupation}
Traits: ${character.traits}
Speech Style: ${character.speechStyle}
Relationship Style: ${character.relationshipStyle}
Strengths: ${character.strengths}
Weaknesses: ${character.weaknesses}
Fears: ${character.fears}
Secret Type: ${character.secretType}
Profile: ${character.profile}
Relationship Values: ${JSON.stringify(character.relationship || {})}
Behaviour Rules: ${character.rules || ""}
Story Triggers: ${character.triggers || ""}
`
).join("\n")}

RECENT STORY EVENTS

${JSON.stringify(
(storyMemory || []).slice(-5)
)}

IMPORTANT CHOICES MADE

${JSON.stringify(
(importantChoices || []).slice(-6)
)}

PLAYER ACTION

${action}

RULES

Return ONLY valid JSON.

JSON format:

{
  "mode":"normal",
  "narration":"Story narration here",
  "messages":[
    {
      "character":"Character Name",
      "text":"Dialogue"
    }
  ],
  "choices":[],
  "chapterComplete":false,
  "summary":null
}

MODE RULES

If CURRENT CHAPTER MODE is normal:
- Continue the story naturally.
- Do not provide choices.
- choices must be [].
- chapterComplete must be false.

If CURRENT CHAPTER MODE is milestone_choice:
- Continue the scene briefly.
- Then present exactly 4 choices.
- choices must contain exactly 4 objects.
- Do not continue the story after choices.
- Each choice must have type and text.
- Choice types must be exactly:
  emotional
  relationship
  mystery
  risky
- emotional choice must focus on feelings, vulnerability, healing, guilt, grief, or confession.
- relationship choice must focus on trust, romance, friendship, loyalty, betrayal, or alliance.
- mystery choice must focus on secrets, clues, hidden truth, investigation, or unanswered questions.
- risky choice must involve danger, confrontation, escape, sacrifice, or bold action.
- chapterComplete must be false.

If CURRENT CHAPTER MODE is cliffhanger_build:
- Increase suspense.
- Build emotional tension.
- Prepare an important reveal, danger, betrayal, confession, or mystery.
- Do not resolve the main conflict.
- choices must be [].
- chapterComplete must be false.

If CURRENT CHAPTER MODE is chapter_finale:
- Generate a strong cliffhanger.
- Leave an important question unanswered.
- Do not provide choices.
- End at the most dramatic moment possible.
- The final line of narration must be:
  To be continued in Chapter ${currentChapter + 1}...
- chapterComplete must be true.
- summary must include:
  chapterTitle
  keyEvents
  importantChoices
  relationshipChanges
  characterDevelopments
  currentMysteries
  cliffhangerDescription

GENERAL RULES

- Never generate dialogue for the player character: ${playerCharacter.name}.
- Only non-player characters may speak.
- Narration may describe the player character's visible actions, but never decide new actions for them.
- Maintain character personalities.
- Respect story history and previous choices.
- Write like a professional interactive novel.
- Keep narration immersive and emotionally engaging.
- Avoid markdown.
- Output JSON only.
- Keep normal interactions between 120 and 220 words.
- For milestone_choice mode, keep narration brief and make choices concise.
- For chapter_finale mode, allow a stronger dramatic scene and summary.
`;

const aiText =
await callGemini(
prompt,
{
temperature:0.8,
maxOutputTokens:
chapterMode === "chapter_finale"
?
700
:
chapterMode === "milestone_choice"
?
500
:
350
}
);

try{

const cleaned =
aiText
.replace(/```json/g,"")
.replace(/```/g,"")
.trim();

const parsed =
JSON.parse(cleaned);

return {
mode:
parsed.mode || chapterMode,

narration:
parsed.narration || "",

messages:
parsed.messages || [],

choices:
parsed.choices || [],

chapterComplete:
parsed.chapterComplete || false,

summary:
parsed.summary || null
};

}

catch(error){

console.error(
"Chapter JSON Parse Error:"
);

console.error(error);

console.error(
"Raw AI Response:"
);

console.error(
aiText
);

return {

mode:
chapterMode,

narration:
"The moment hangs heavy, but the scene becomes unclear. Take a breath and choose your next move carefully.",

messages:[],

choices:[],

chapterComplete:false,

summary:null

};

}

}

module.exports = {
playChapter
};