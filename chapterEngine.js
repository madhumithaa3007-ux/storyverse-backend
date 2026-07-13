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
chapterPlan,
currentChapterPlan,
importantChoices,
action,
storyMemory

} = data;

const safeStory =
story || {};

const safeCharacters =
characters || [];

const safePlayer =
playerCharacter || {};

const activeChapterPlan =
currentChapterPlan ||
(
Array.isArray(chapterPlan)
?
chapterPlan.find(item=>{

return Number(item.chapter) === Number(currentChapter || 1);

})
:
null
) ||
{};

const milestones =
chapterMilestones || [
5,
15,
25,
35,
45
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
chapterInteractionCount >= 46 &&
chapterInteractionCount <= 49
){

chapterMode =
"cliffhanger_build";

}

if(
chapterInteractionCount >= 50
){

chapterMode =
"chapter_finale";

}

const prompt = `

You are StoryVerse AI.

You are writing an interactive story game response.

IMPORTANT OUTPUT RULE:

Return ONLY valid JSON.
Do not include markdown.
Do not include explanation outside JSON.
Do not wrap JSON in code blocks.

STORY SUMMARY

${
safeStory.story ||
safeStory.summary ||
safeStory.fullStory ||
JSON.stringify(safeStory)
}

CURRENT CHAPTER

${currentChapter || 1}

CHAPTER LIMIT

${chapterLimit || 20}

CURRENT CHAPTER ROUTE / PLAN

Chapter Title:
${activeChapterPlan.title || "Untitled Chapter"}

Chapter Goal:
${activeChapterPlan.goal || "Move the story forward according to the main plot."}

Chapter Setting:
${activeChapterPlan.setting || ""}

Key Events That Should Happen In This Chapter:
${JSON.stringify(activeChapterPlan.keyEvents || [])}

Emotional Focus:
${activeChapterPlan.emotionalFocus || ""}

Required Reveal:
${activeChapterPlan.requiredReveal || ""}

Chapter Cliffhanger:
${activeChapterPlan.cliffhanger || ""}

CURRENT INTERACTION COUNT

${chapterInteractionCount} / 50

CURRENT CHAPTER MODE

${chapterMode}

PLAYER CHARACTER

Name:
${safePlayer.name || "Player"}

Role:
${safePlayer.role || "Main Character"}

Occupation:
${safePlayer.occupation || ""}

Traits:
${safePlayer.traits || ""}

Speech Style:
${safePlayer.speechStyle || ""}

Relationship Style:
${safePlayer.relationshipStyle || ""}

Strengths:
${safePlayer.strengths || ""}

Weaknesses:
${safePlayer.weaknesses || ""}

Likes:
${safePlayer.likes || ""}

Dislikes:
${safePlayer.dislikes || ""}

Fears:
${safePlayer.fears || ""}

Secret Type:
${safePlayer.secretType || ""}

Profile:
${safePlayer.profile || ""}

Persona Rules:
${safePlayer.rules || ""}

Persona Triggers:
${safePlayer.triggers || ""}

IMPORTANT PLAYER RULE

The player controls:

${safePlayer.name || "Player"}

Never generate dialogue,
thoughts,
actions,
or decisions
for ${safePlayer.name || "the player character"}.

Only generate:

- Short narration
- Dialogue from other characters only

The player character may appear in narration,
but may never speak.

ALL NON-PLAYER CHARACTERS

${safeCharacters
.filter(character =>
character &&
character.name !== safePlayer.name
)
.map(character =>
`
Name: ${character.name || ""}
Role: ${character.role || ""}
Occupation: ${character.occupation || ""}
Traits: ${character.traits || ""}
Speech Style: ${character.speechStyle || ""}
Relationship Style: ${character.relationshipStyle || ""}
Strengths: ${character.strengths || ""}
Weaknesses: ${character.weaknesses || ""}
Likes: ${character.likes || ""}
Dislikes: ${character.dislikes || ""}
Fears: ${character.fears || ""}
Secret Type: ${character.secretType || ""}
Profile: ${character.profile || ""}
Relationship Values: ${JSON.stringify(character.relationship || {})}
Behaviour Rules: ${character.rules || ""}
Story Triggers: ${character.triggers || ""}
`
).join("\n")}

RECENT STORY EVENTS

${JSON.stringify(
(storyMemory || []).slice(-20)
)}

IMPORTANT CHOICES MADE

${JSON.stringify(
(importantChoices || []).slice(-12)
)}

PLAYER ACTION

${action || ""}

JSON FORMAT

{
  "mode":"normal",
  "narration":"Short story narration here",
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

NORMAL MODE RULES

If CURRENT CHAPTER MODE is normal:

- Continue the story naturally.
- Keep narration short: 45 to 80 words only.
- Use only 1 short narrator paragraph.
- Focus only on the immediate result of the player's action.
- Do not over-explain emotions or surroundings.
- Do not provide choices.
- choices must be [].
- chapterComplete must be false.
- Include 0 to 2 character dialogue messages only if needed.
- Each dialogue must be 1 to 2 sentences only.

MILESTONE CHOICE MODE RULES

If CURRENT CHAPTER MODE is milestone_choice:

- Continue the scene briefly.
- Keep narration between 35 and 60 words.
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

CLIFFHANGER BUILD MODE RULES

If CURRENT CHAPTER MODE is cliffhanger_build:

- Increase suspense.
- Keep narration between 60 and 100 words.
- Build emotional tension.
- Prepare an important reveal, danger, betrayal, confession, or mystery.
- Do not resolve the main conflict.
- choices must be [].
- chapterComplete must be false.

CHAPTER FINALE MODE RULES

If CURRENT CHAPTER MODE is chapter_finale:

- Generate a strong cliffhanger.
- Keep narration between 100 and 160 words.
- Leave an important question unanswered.
- Do not provide choices.
- End at the most dramatic moment possible.
- The final line of narration must be:
  To be continued in Chapter ${Number(currentChapter || 1) + 1}...
- chapterComplete must be true.
- summary must include:
  chapterTitle
  keyEvents
  importantChoices
  relationshipChanges
  characterDevelopments
  currentMysteries
  cliffhangerDescription

GENERAL STORY RULES

- Never generate dialogue for the player character: ${safePlayer.name || "Player"}.
- Only non-player characters may speak.
- Narration may describe visible reactions, but never decide new actions for the player character.
- Maintain character personalities.
- Respect story history and previous choices.
- Write like a premium interactive novel.
- Keep the response compact and mobile-friendly.
- Avoid long paragraphs.
- Avoid repetitive narration.
- Avoid markdown.
- Output JSON only.
- Do not repeat the same narration style from the previous response.
- Do not reuse the same emotional phrases repeatedly.
- Avoid generic lines like "the air felt heavy" unless truly needed.
- Each response must move the scene forward in a specific way.
- Mention concrete actions, reactions, clues, or emotional shifts.
- Follow the CURRENT CHAPTER ROUTE / PLAN.
- The story must feel pre-planned, not random.
- Every response should move toward the chapter goal.
- Player choices may change the emotional route, relationship route, mystery route, or risky route, but the chapter must still progress toward the planned key events.
- Do not finish required reveals too early.
- Do not ignore the chapter cliffhanger.
- By interaction 45, prepare the chapter cliffhanger.
- By interaction 50, end the chapter with the planned cliffhanger or a variation caused by the player's choices.
- The player is a real character in the story, but never speak for them.
- The player action can influence narration, reactions, clues, and relationship shifts.
- Keep the base story route consistent across the chapter.

`;

const aiText =
await callGemini(
prompt,
{
temperature:0.65,
responseMimeType:"application/json",
maxOutputTokens:
chapterMode === "chapter_finale"
?
1000
:
chapterMode === "milestone_choice"
?
700
:
chapterMode === "cliffhanger_build"
?
600
:
450
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

return {

mode:
parsed.mode || chapterMode,

narration:
parsed.narration || "",

messages:
Array.isArray(parsed.messages)
?
parsed.messages.slice(0,3)
:
[],

choices:
Array.isArray(parsed.choices)
?
parsed.choices
:
[],

chapterComplete:
parsed.chapterComplete || false,

summary:
parsed.summary || null,

isFallback:false

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

return createFallbackChapterResponse(
chapterMode,
action
);

}

}

function createFallbackChapterResponse(
chapterMode,
action
){

const fallbackMessages = [

"StoryVerse had trouble shaping the next scene clearly. Try a simple action like looking around, asking a question, or following a clue.",

"The scene needs a clearer direction. Try writing what your character does next in one direct sentence.",

"StoryVerse paused for a moment. Continue with a small action, a question, or an emotional reaction.",

"The story thread became unclear. Try continuing with a focused action such as investigating, speaking to someone, hiding, running, or waiting.",

"StoryVerse could not safely continue this scene. Try again with a clearer action so the chapter can move forward."

];

const randomMessage =
fallbackMessages[
Math.floor(
Math.random() * fallbackMessages.length
)
];

const fallbackChoices = [
{
type:"emotional",
text:"Take a deep breath and steady yourself."
},
{
type:"relationship",
text:"Call out to someone you trust."
},
{
type:"mystery",
text:"Look around carefully for a clue."
},
{
type:"risky",
text:"Move forward despite the danger."
}
];

return {

mode:
chapterMode,

narration:
randomMessage,

messages:[],

choices:
chapterMode === "milestone_choice"
?
fallbackChoices
:
[],

chapterComplete:false,

summary:null,

isFallback:true

};

}

module.exports = {
playChapter
};