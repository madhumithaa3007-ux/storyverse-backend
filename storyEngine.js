const { callGemini } =
require("./geminiClient");

function clampChapterCount(value){

const parsed =
parseInt(value);

if(Number.isNaN(parsed)){

return 20;

}

return Math.max(
1,
Math.min(
30,
parsed
)
);

}

function cleanJsonText(aiText){

let cleaned =
String(aiText || "")
.replace(/```json/gi,"")
.replace(/```/g,"")
.trim();

const firstBrace =
cleaned.indexOf("{");

const lastBrace =
cleaned.lastIndexOf("}");

if(
firstBrace !== -1 &&
lastBrace > firstBrace
){

cleaned =
cleaned.substring(
firstBrace,
lastBrace + 1
);

}

return cleaned;

}

function extractStoryPreview(aiText){

const rawText =
String(aiText || "")
.trim();

if(!rawText){

return "";

}

try{

const parsed =
JSON.parse(
cleanJsonText(rawText)
);

return String(
parsed.storyPreview ||
parsed.story ||
""
).trim();

}
catch(error){

const match =
rawText.match(
/"storyPreview"\s*:\s*"([\s\S]*?)"\s*,\s*"chapterPlan"/
);

if(match && match[1]){

return match[1]
.replace(/\\n/g,"\n")
.replace(/\\"/g,'"')
.trim();

}

return rawText
.replace(/```json/gi,"")
.replace(/```/g,"")
.trim();

}

}

function createFallbackChapterPlan(
storyData,
chapterCount
){

const title =
String(
storyData.title ||
"Untitled Story"
).trim();

const mainConflict =
String(
storyData.conflictType ||
"the central conflict"
).trim();

const romance =
String(
storyData.romanceType ||
"the central relationship"
).trim();

return Array.from(
{
length:
chapterCount
},
(_,index)=>{

const chapterNumber =
index + 1;

const progress =
chapterNumber /
chapterCount;

let phase =
"development";

if(chapterNumber === 1){

phase =
"opening";

}
else if(progress <= 0.3){

phase =
"rising";

}
else if(progress <= 0.65){

phase =
"midpoint";

}
else if(progress < 1){

phase =
"late";

}
else{

phase =
"finale";

}

const phaseContent = {

opening:{

title:
"The First Turning Point",

goal:
"Introduce the player, the important relationships, and the event that makes the old life impossible to continue.",

keyEvents:[
"Establish the player's everyday situation and strongest emotional need.",
"Bring the most important characters into direct contact.",
"Trigger the incident that begins the main conflict."
],

reveal:
"Reveal the first sign that the situation is more complicated than it appears.",

cliffhanger:
"End with a discovery, arrival, threat, or emotional shock that forces the player forward."

},

rising:{

title:
"Pressure Beneath the Surface",

goal:
"Deepen the conflict and make the player's relationships affect what can happen next.",

keyEvents:[
"Create a consequence from an earlier action or choice.",
"Develop trust, attraction, rivalry, suspicion, or family tension.",
"Reveal a clue or complication connected to " + mainConflict + "."
],

reveal:
"Reveal information that changes how the player understands one important character.",

cliffhanger:
"End when a plan fails, a secret is nearly exposed, or an unexpected person intervenes."

},

midpoint:{

title:
"The Truth Changes Shape",

goal:
"Deliver a major turning point that changes the player's goal or understanding of the story.",

keyEvents:[
"Force the player to confront the cost of earlier choices.",
"Shift an important relationship through confession, betrayal, protection, or conflict.",
"Reveal a major truth connected to " + mainConflict + "."
],

reveal:
"Reveal a truth that makes the original problem larger or more personal.",

cliffhanger:
"End with a decision or danger that makes returning to the old path impossible."

},

late:{

title:
"Everything at Risk",

goal:
"Bring the major relationships, secrets, and threats into direct conflict.",

keyEvents:[
"Make a previous choice produce a visible reward or consequence.",
"Push " + romance + " toward closeness, rupture, sacrifice, or honesty.",
"Move the player closer to confronting the source of " + mainConflict + "."
],

reveal:
"Reveal the final missing information needed to understand the true conflict.",

cliffhanger:
"End with betrayal, danger, separation, exposure, or a final impossible choice."

},

finale:{

title:
"The Final Choice",

goal:
"Resolve the central conflict while allowing earlier choices and relationships to shape the ending.",

keyEvents:[
"Bring the player face to face with the central conflict.",
"Pay off the most important relationship and mystery threads.",
"Let the player's accumulated choices influence the final outcome."
],

reveal:
"Reveal the final truth and the real cost of the ending.",

cliffhanger:
"Conclude the story with a satisfying emotional image, consequence, or earned final revelation."

}

};

const content =
phaseContent[phase];

return {

chapter:
chapterNumber,

title:
chapterNumber === 1 ||
chapterNumber === chapterCount
?
content.title
:
"Chapter " + chapterNumber + ": " + content.title,

goal:
content.goal,

setting:
String(
storyData.worldSetting ||
"The story's established setting"
),

keyEvents:
content.keyEvents,

emotionalFocus:
"Let the player's choices alter trust, tension, vulnerability, loyalty, suspicion, or romance without abandoning the planned route.",

requiredReveal:
content.reveal,

choiceImpact:
"Emotional, relationship, mystery, and risky choices may change reactions, alliances, clues, and consequences while preserving the chapter's main goal.",

cliffhanger:
content.cliffhanger

};

}
);

}

function normalizeChapterPlan(
rawPlan,
chapterCount,
storyData
){

const fallbackPlan =
createFallbackChapterPlan(
storyData,
chapterCount
);

const safePlan =
Array.isArray(rawPlan)
?
rawPlan
:
[];

return Array.from(
{
length:
chapterCount
},
(_,index)=>{

const fallback =
fallbackPlan[index];

const source =
safePlan.find(item=>{

return Number(item && item.chapter) ===
index + 1;

}) ||
safePlan[index] ||
{};

const keyEvents =
Array.isArray(source.keyEvents)
?
source.keyEvents
.map(event=>String(event || "").trim())
.filter(Boolean)
.slice(0,5)
:
[];

return {

chapter:
index + 1,

title:
String(
source.title ||
fallback.title
).trim(),

goal:
String(
source.goal ||
fallback.goal
).trim(),

setting:
String(
source.setting ||
fallback.setting
).trim(),

keyEvents:
keyEvents.length > 0
?
keyEvents
:
fallback.keyEvents,

emotionalFocus:
String(
source.emotionalFocus ||
fallback.emotionalFocus
).trim(),

requiredReveal:
String(
source.requiredReveal ||
fallback.requiredReveal
).trim(),

choiceImpact:
String(
source.choiceImpact ||
fallback.choiceImpact
).trim(),

cliffhanger:
String(
source.cliffhanger ||
fallback.cliffhanger
).trim()

};

}
);

}

async function generateStory(storyData){

const safeData =
storyData || {};

const title =
safeData.title ||
"Untitled Story";

const genre =
safeData.genre ||
"Drama";

const mood =
safeData.mood ||
"Emotional";

const theme =
safeData.theme ||
"Secrets and Lies";

const worldSetting =
safeData.worldSetting ||
"Modern City";

const romanceType =
safeData.romanceType ||
"Slow Burn";

const conflictType =
safeData.conflictType ||
"Hidden Secret";

const chapterCount =
clampChapterCount(
safeData.storyLength
);

const endingCount =
safeData.endingCount ||
"3";

const idea =
safeData.idea ||
"A character enters a life-changing story full of emotion, secrets, and difficult choices.";

const prompt = `
You are StoryVerse AI.

Create the foundation for an interactive story game.

Return ONLY valid JSON.
Do not include markdown.
Do not include explanation outside JSON.
Do not wrap JSON in code blocks.

Generate only:
1. A concise story preview.
2. A connected chapter-by-chapter route for the entire story.

Characters are generated separately.
Do not return suggestedCharacters or full character profiles.

STORY INPUTS

Title: ${title}
Genre: ${genre}
Mood: ${mood}
Theme: ${theme}
World Setting: ${worldSetting}
Romance Type: ${romanceType}
Conflict Type: ${conflictType}
Chapter Count: ${chapterCount}
Possible Ending Count: ${endingCount}
Story Idea: ${idea}

OUTPUT JSON FORMAT

{
  "storyPreview":"A complete 150 to 220 word preview",
  "chapterPlan":[
    {
      "chapter":1,
      "title":"Specific chapter title",
      "goal":"The main purpose of this chapter",
      "setting":"Main location and atmosphere",
      "keyEvents":[
        "Specific event 1",
        "Specific event 2",
        "Specific event 3"
      ],
      "emotionalFocus":"The main emotional or relationship tension",
      "requiredReveal":"The clue, truth, danger, or relationship shift that must happen",
      "choiceImpact":"How choices can change reactions and consequences without abandoning the base route",
      "cliffhanger":"The planned chapter ending"
    }
  ]
}

STORY PREVIEW RULES

- Write 150 to 220 words.
- Present the setup, emotional hook, central conflict, important relationship tension, mystery, and setting.
- Do not write Chapter 1.
- Do not reveal the complete ending.
- End with a complete and compelling hook, not an abrupt sentence.

CHAPTER PLAN RULES

- Create exactly ${chapterCount} chapter objects.
- Plan the complete story from opening to final resolution.
- Every chapter must continue from the previous chapter.
- Every chapter must have one clear goal.
- Include exactly 3 concise but specific key events per chapter.
- Include one required reveal or meaningful shift per chapter.
- Include one planned cliffhanger or strong closing beat per chapter.
- Do not solve the main conflict too early.
- Early chapters introduce the cast, conflict, and first hook.
- Middle chapters deepen secrets, romance, rivalry, betrayal, danger, and emotional consequences.
- Late chapters bring relationships, clues, and threats into direct conflict.
- The final chapter resolves the central conflict and supports multiple endings shaped by accumulated choices.
- Choices may change relationships, clues, alliances, emotional tone, and consequences, but the base plot must remain coherent.
- Keep each chapter object concise enough for valid JSON.

Return valid JSON only.
`;

let aiText =
"";

try{

aiText =
await callGemini(
prompt,
{
temperature:0.72,
responseMimeType:"application/json",
maxOutputTokens:5200
}
);

const parsed =
JSON.parse(
cleanJsonText(aiText)
);

const storyPreview =
String(
parsed.storyPreview ||
parsed.story ||
""
).trim();

return {

storyPreview:
storyPreview ||
String(idea).trim(),

/*
Keep this empty property temporarily so older
frontend and server code does not break.
*/
suggestedCharacters:[],

chapterPlan:
normalizeChapterPlan(
parsed.chapterPlan,
chapterCount,
safeData
)

};

}
catch(error){

console.error(
"Story generation or JSON parsing failed:",
error
);

if(aiText){

console.error(
"Raw AI response:",
aiText
);

}

return {

storyPreview:
extractStoryPreview(aiText) ||
String(idea).trim(),

suggestedCharacters:[],

chapterPlan:
createFallbackChapterPlan(
safeData,
chapterCount
)

};

}

}

module.exports = {
generateStory
};
