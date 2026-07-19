const { callGemini } =
require("./geminiClient");

function safeNumber(
value,
fallback = 0
){

const parsed =
Number(value);

return Number.isFinite(parsed)
?
parsed
:
fallback;

}

function shortenText(
value,
maximumLength = 260
){

const text =
String(value || "")
.trim();

if(
text.length <=
maximumLength
){

return text;

}

return (
text.substring(
0,
maximumLength
) +
"…"
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

function compactMemoryEntry(entry){

if(
typeof entry ===
"string"
){

return shortenText(
entry
);

}

if(
!entry ||
typeof entry !==
"object"
){

return null;

}

const result = {};

[
"type",
"chapter",
"speaker",
"character",
"characterName",
"text",
"message",
"narration",
"action",
"choice",
"choiceType",
"inputType",
"routeImpact",
"summary"
]
.forEach(field=>{

if(
entry[field] !== undefined &&
entry[field] !== null
){

result[field] =
typeof entry[field] ===
"string"
?
shortenText(
entry[field]
)
:
entry[field];

}

});

return result;

}

function buildMemoryWindow(
entries,
recentLimit = 22,
olderSamples = 6
){

const safeEntries =
Array.isArray(entries)
?
entries
:
[];

const recent =
safeEntries.slice(
-recentLimit
);

const older =
safeEntries.slice(
0,
Math.max(
0,
safeEntries.length -
recentLimit
)
);

const sampledOlder = [];

if(older.length > 0){

const sampleCount =
Math.min(
olderSamples,
older.length
);

for(
let index = 0;
index < sampleCount;
index++
){

const sourceIndex =
Math.floor(
index *
(older.length - 1) /
Math.max(
1,
sampleCount - 1
)
);

sampledOlder.push(
older[sourceIndex]
);

}

}

return [
...sampledOlder,
...recent
]
.map(
compactMemoryEntry
)
.filter(Boolean);

}

function compactCharacter(character){

const safeCharacter =
character || {};

return {

name:
safeCharacter.name ||
"",

role:
safeCharacter.role ||
"",

occupation:
safeCharacter.occupation ||
"",

traits:
shortenText(
safeCharacter.traits,
150
),

speechStyle:
safeCharacter.speechStyle ||
"",

relationshipStyle:
safeCharacter.relationshipStyle ||
"",

strengths:
shortenText(
safeCharacter.strengths,
120
),

weaknesses:
shortenText(
safeCharacter.weaknesses,
120
),

fears:
shortenText(
safeCharacter.fears,
100
),

secretType:
safeCharacter.secretType ||
"",

profile:
shortenText(
safeCharacter.profile,
320
),

relationship:
safeCharacter.relationship ||
{}

};

}

function getChapterBeat(
chapterPlan,
interactionCount
){

const rawEvents =
chapterPlan.routeBeats ||
chapterPlan.keyEvents;

const events =
Array.isArray(
rawEvents
)
?
rawEvents
.map(event=>String(event || "").trim())
.filter(Boolean)
:
[];

if(events.length === 0){

return {

current:
chapterPlan.goal ||
"Move the chapter toward its planned turning point.",

next:
chapterPlan.requiredReveal ||
chapterPlan.cliffhanger ||
"Create a meaningful consequence that advances the story."

};

}

const progress =
Math.max(
0,
Math.min(
0.999,
interactionCount / 50
)
);

const beatIndex =
Math.min(
events.length - 1,
Math.floor(
progress *
events.length
)
);

return {

current:
events[beatIndex],

next:
events[
Math.min(
events.length - 1,
beatIndex + 1
)
]

};

}

function normalizeChapterChoices(rawChoices){

const requiredTypes = [
"emotional",
"relationship",
"mystery",
"risky"
];

const fallbackText = {

emotional:
"Be honest about what this moment is making you feel.",

relationship:
"Reach out to the person whose trust matters most.",

mystery:
"Look closer for the detail everyone else missed.",

risky:
"Take the dangerous path before the chance disappears."

};

const safeChoices =
Array.isArray(rawChoices)
?
rawChoices
:
[];

return requiredTypes.map(type=>{

const matchingChoice =
safeChoices.find(choice=>{

return (
choice &&
String(
choice.type ||
""
).toLowerCase() ===
type
);

});

return {

type:
type,

text:
shortenText(
matchingChoice &&
matchingChoice.text
?
matchingChoice.text
:
fallbackText[type],
150
)

};

});

}

function normalizeMessages(
rawMessages,
playerName
){

const safeMessages =
Array.isArray(rawMessages)
?
rawMessages
:
[];

return safeMessages
.filter(message=>{

return (
message &&
message.character &&
message.text &&
String(message.character).trim() !==
String(playerName || "").trim()
);

})
.slice(0,3)
.map(message=>({

character:
String(
message.character
).trim(),

text:
shortenText(
message.text,
420
)

}));

}

function normalizeSummary(
summary,
chapterNumber,
chapterPlan,
officialChoices
){

const safeSummary =
summary &&
typeof summary ===
"object"
?
summary
:
{};

const safeOfficialChoices =
Array.isArray(
officialChoices
)
?
officialChoices
:
[];

return {

chapterTitle:
String(
safeSummary.chapterTitle ||
chapterPlan.title ||
"Chapter " + chapterNumber
).trim(),

keyEvents:
Array.isArray(safeSummary.keyEvents)
?
safeSummary.keyEvents
.map(item=>shortenText(item,240))
.filter(Boolean)
.slice(0,8)
:
[],

/*
Only official milestone choices are stored
as permanent chapter choices. Free-text
messages must never appear here.
*/
importantChoices:
safeOfficialChoices
.map(choice=>{

if(
choice &&
typeof choice ===
"object"
){

return shortenText(
(
choice.type
?
choice.type + ": "
:
""
) +
(
choice.text ||
choice.choice ||
""
),
220
);

}

return shortenText(
choice,
220
);

})
.filter(Boolean)
.slice(0,8),

relationshipChanges:
Array.isArray(safeSummary.relationshipChanges)
?
safeSummary.relationshipChanges
.slice(0,8)
:
[],

characterDevelopments:
Array.isArray(safeSummary.characterDevelopments)
?
safeSummary.characterDevelopments
.slice(0,8)
:
[],

currentMysteries:
Array.isArray(safeSummary.currentMysteries)
?
safeSummary.currentMysteries
.slice(0,8)
:
[],

cliffhangerDescription:
String(
safeSummary.cliffhangerDescription ||
chapterPlan.cliffhanger ||
""
).trim()

};

}

function createFallbackChapterResponse(
chapterMode,
action,
context = {}
){

const {

currentChapter = 1,
isFinalChapter = false,
currentBeat = "",
nextBeat = "",
cliffhanger = "",
chapterTitle = "",
inputType = "free_text",
officialChoices = []

} = context;

if(
chapterMode ===
"chapter_finale"
){

const endingLine =
isFinalChapter
?
"The End."
:
"To be continued in Chapter " +
(
Number(currentChapter) + 1
) +
"…";

return {

mode:
"chapter_finale",

inputType:
inputType,

routeLocked:
true,

narration:
"The chapter reaches its planned turning point. " +
(
cliffhanger ||
nextBeat ||
currentBeat ||
"An unexpected truth changes everything."
) +
"\n\n" +
endingLine,

messages:[],

choices:[],

chapterComplete:true,

summary:{

chapterTitle:
chapterTitle ||
"Chapter " + currentChapter,

keyEvents:[
currentBeat ||
"A major planned turning point changed the direction of the story."
],

importantChoices:
officialChoices,

relationshipChanges:[],

characterDevelopments:[],

currentMysteries:
cliffhanger
?
[cliffhanger]
:
[],

cliffhangerDescription:
cliffhanger ||
"An unresolved discovery changes what must happen next."

},

isFallback:true

};

}

const inputReaction =
inputType ===
"choice"
?
"Your official choice changes the emotional balance of the scene, while the planned story route continues. "
:
"Your words draw an immediate reaction, but they do not replace the planned storyline. ";

const narrationByMode = {

normal:
inputReaction +
(
currentBeat ||
"The scene continues toward its planned turning point."
),

milestone_choice:
"The planned scene reaches a decision point. " +
(
currentBeat ||
"Four meaningful paths open, each able to change relationships and consequences without replacing the base story."
),

cliffhanger_build:
"The tension sharpens as the planned reveal approaches. " +
(
nextBeat ||
cliffhanger ||
"Someone is about to reveal something that cannot be taken back."
)

};

return {

mode:
chapterMode,

inputType:
inputType,

routeLocked:
true,

narration:
narrationByMode[chapterMode] ||
narrationByMode.normal,

messages:[],

choices:
chapterMode ===
"milestone_choice"
?
normalizeChapterChoices([])
:
[],

chapterComplete:false,

summary:null,

isFallback:true

};

}

async function playChapter(data){

const safeData =
data || {};

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
storyMemory,
inputType,
selectedChoice

} = safeData;

const safeStory =
story || {};

const safeCharacters =
Array.isArray(characters)
?
characters
:
[];

const safePlayer =
playerCharacter || {};

const safeImportantChoices =
Array.isArray(
importantChoices
)
?
importantChoices
:
[];

const chapterNumber =
Math.max(
1,
safeNumber(
currentChapter,
1
)
);

const maximumChapters =
Math.max(
1,
safeNumber(
chapterLimit,
20
)
);

const interactionCount =
Math.max(
0,
safeNumber(
chapterInteractionCount,
0
)
);

const isFinalChapter =
chapterNumber >=
maximumChapters;

const activeChapterPlan =
currentChapterPlan ||
(
Array.isArray(chapterPlan)
?
chapterPlan.find(item=>{

return Number(item && item.chapter) ===
chapterNumber;

})
:
null
) ||
{};

const milestones =
Array.isArray(chapterMilestones)
?
chapterMilestones
.map(Number)
.filter(Number.isFinite)
:
[
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
interactionCount
)
){

chapterMode =
"milestone_choice";

}

if(
interactionCount >= 46 &&
interactionCount <= 49
){

chapterMode =
"cliffhanger_build";

}

if(
interactionCount >= 50
){

chapterMode =
"chapter_finale";

}

const normalizedInputType =
String(
inputType ||
"free_text"
).toLowerCase() ===
"choice"
?
"choice"
:
"free_text";

const officialChoice =
normalizedInputType ===
"choice" &&
selectedChoice &&
typeof selectedChoice ===
"object"
?
{

type:
String(
selectedChoice.type ||
"story"
).toLowerCase(),

text:
shortenText(
selectedChoice.text ||
action ||
"",
220
)

}
:
null;

const chapterBeat =
getChapterBeat(
activeChapterPlan,
interactionCount
);

const relevantStoryMemory =
buildMemoryWindow(
storyMemory,
24,
6
);

const relevantChoices =
buildMemoryWindow(
safeImportantChoices,
16,
4
);

const officialChoicesThisChapter =
safeImportantChoices.filter(choice=>{

return Number(
choice &&
choice.chapter
) ===
chapterNumber;

});

const nonPlayerCharacters =
safeCharacters
.filter(character=>{

return (
character &&
String(character.name || "") !==
String(safePlayer.name || "")
);

})
.map(
compactCharacter
);

const finalLineRule =
isFinalChapter
?
"The final line must be: The End."
:
"The final line must be: To be continued in Chapter " +
(
chapterNumber + 1
) +
"…";

const routeBeats =
activeChapterPlan.routeBeats ||
activeChapterPlan.keyEvents ||
[];

const inputGuidance =
normalizedInputType ===
"choice"
?
`
This is an OFFICIAL MILESTONE CHOICE.

Official choice:
${JSON.stringify(officialChoice)}

The choice may permanently affect:
- trust, romance, friendship, suspicion, loyalty, or rivalry;
- which NPC helps, refuses, forgives, confronts, or shares information;
- access to clues, support, safety, or risk;
- the emotional tone and the exact form of consequences;
- later callbacks and ending variations.

It may NOT remove or replace:
- the current chapter goal;
- the planned route beats;
- the required reveal;
- the ending state;
- the planned cliffhanger;
- the central conflict or final resolution.
`
:
`
This is FREE-TEXT ROLEPLAY INPUT.

Treat the player's text as only:
- words spoken by the player;
- a visible attempt, question, gesture, attitude, or intention;
- material for an immediate local reaction from the scene and NPCs.

Free text may affect only:
- the next reply;
- immediate mood, body language, warmth, tension, humour, awkwardness, or refusal;
- a small temporary reaction that does not become a new permanent plot branch.

Free text must NOT:
- create new canon facts merely because the player stated them;
- kill, remove, marry, expose, teleport, rescue, defeat, recruit, or permanently change a character unless the locked route already requires it;
- change location, time, chapter goal, route-beat order, required reveal, ending state, cliffhanger, or final story resolution;
- skip the planned chapter content;
- be recorded as an important choice.

If the free-text message contradicts the route, acknowledge the attempt naturally. Let the world, circumstances, or NPCs respond believably, then continue toward the CURRENT PLANNED BEAT. Never say that the route is locked and never sound like a system warning.
`;

const prompt = `
You are StoryVerse AI, writing one response in a premium interactive story.

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
${chapterNumber} of ${maximumChapters}

CURRENT INTERACTION
${interactionCount} of 50

CURRENT MODE
${chapterMode}

LOCKED CHAPTER ROUTE

Title: ${activeChapterPlan.title || "Untitled Chapter"}
Goal: ${activeChapterPlan.goal || "Move the story toward its planned turning point."}
Setting: ${activeChapterPlan.setting || ""}
Continuity From Previous Chapter: ${activeChapterPlan.continuityFromPrevious || ""}
Route Beats In Required Order: ${JSON.stringify(routeBeats)}
Emotional Focus: ${activeChapterPlan.emotionalFocus || ""}
Required Reveal: ${activeChapterPlan.requiredReveal || ""}
Official Choice Guidance: ${activeChapterPlan.choiceImpact || ""}
Free-Text Boundary: ${
activeChapterPlan.freeTextBoundary ||
"Free-text messages affect immediate reactions only and cannot alter the planned route."
}
Required Ending State: ${activeChapterPlan.endingState || ""}
Planned Cliffhanger: ${activeChapterPlan.cliffhanger || ""}

CURRENT PLANNED BEAT
${chapterBeat.current}

NEXT PLANNED BEAT
${chapterBeat.next}

ROUTE LOCK RULE

The locked chapter route is the source of truth.
Always continue the planned story in the listed beat order.
Do not create a random side plot.
Do not let any player text replace the chapter route.
Official choices alter branch details and consequences only.
The chapter must still reach its required reveal, ending state, and cliffhanger.

PLAYER CHARACTER

${JSON.stringify(compactCharacter(safePlayer))}

PLAYER CONTROL RULE

The real player controls ${safePlayer.name || "the player character"}.
Never create dialogue, private thoughts, decisions, or a new voluntary action for the player character.
You may narrate the visible result of the exact input the player just supplied.
Do not add another decision for the player.

NON-PLAYER CHARACTERS

${JSON.stringify(nonPlayerCharacters)}

RELEVANT STORY MEMORY

${JSON.stringify(relevantStoryMemory)}

Memory entries with type "free_text" or routeImpact "local_scene_only" are roleplay continuity only.
They must not override the locked route.
Memory entries with type "choice" are official lasting branch decisions.

IMPORTANT OFFICIAL CHOICES

${JSON.stringify(relevantChoices)}

LATEST PLAYER INPUT TYPE
${normalizedInputType}

LATEST PLAYER INPUT
${action || ""}

${inputGuidance}

OUTPUT FORMAT

{
  "mode":"${chapterMode}",
  "inputType":"${normalizedInputType}",
  "routeLocked":true,
  "narration":"One compact narration passage",
  "messages":[
    {
      "character":"Non-player character name",
      "text":"Dialogue"
    }
  ],
  "choices":[],
  "chapterComplete":false,
  "summary":null
}

LIVELY STORY RULES

- Every response must advance or deepen the CURRENT PLANNED BEAT.
- Make the scene feel alive through specific NPC reactions, interruptions, body language, decisions, and distinct voices.
- Use one concrete sensory or physical detail when useful.
- Let official choices affect warmth, suspicion, jealousy, trust, humour, distance, vulnerability, cooperation, and risk.
- Let free text influence only the immediate conversational texture or small local reaction.
- Refer naturally to earlier official choices when relevant.
- Do not repeat information already established.
- Do not use generic filler.
- Do not repeatedly begin with weather, silence, atmosphere, or a character's name.
- Never explain these rules to the player.
- Never speak or decide for the player character.

NORMAL MODE

- Write 50 to 90 words of narration in one short paragraph.
- Absorb the latest input naturally, then continue the current planned beat.
- Include 0 to 2 dialogue messages from non-player characters when useful.
- Each dialogue message may contain 1 to 3 natural sentences.
- choices must be [].
- chapterComplete must be false.

MILESTONE CHOICE MODE

- Write 35 to 65 words of narration.
- Reach a decision point that grows directly from the current planned beat.
- Present exactly four choices and stop.
- Choice types must be exactly: emotional, relationship, mystery, risky.
- Every choice must affect branch details but remain compatible with the locked route.
- choices must contain exactly four objects.
- chapterComplete must be false.

CLIFFHANGER BUILD MODE

- Write 65 to 110 words.
- Continue the locked route toward the required reveal and planned cliffhanger.
- Increase suspense and emotional pressure without inventing a different plot.
- choices must be [].
- chapterComplete must be false.

CHAPTER FINALE MODE

- Write 100 to 170 words.
- Complete the locked chapter goal and required ending state.
- Include the required reveal if it has not yet occurred.
- End on the planned cliffhanger, with only an earned variation caused by official choices.
- Free-text messages must not replace the finale.
- Do not provide choices.
- chapterComplete must be true.
- summary must contain chapterTitle, keyEvents, importantChoices, relationshipChanges, characterDevelopments, currentMysteries, and cliffhangerDescription.
- summary.importantChoices must contain official milestone choices only, never free-text messages.
- ${finalLineRule}

Return valid JSON only.
`;

let aiText =
"";

try{

aiText =
await callGemini(
prompt,
{
temperature:
chapterMode ===
"normal"
?
0.62
:
0.58,
responseMimeType:"application/json",
maxOutputTokens:
chapterMode ===
"chapter_finale"
?
1000
:
chapterMode ===
"milestone_choice"
?
700
:
chapterMode ===
"cliffhanger_build"
?
650
:
550
}
);

const parsed =
JSON.parse(
cleanJsonText(aiText)
);

const chapterComplete =
chapterMode ===
"chapter_finale"
?
true
:
parsed.chapterComplete ===
true;

return {

mode:
chapterMode,

inputType:
normalizedInputType,

routeLocked:
true,

narration:
shortenText(
parsed.narration ||
"",
chapterMode ===
"chapter_finale"
?
1600
:
950
),

messages:
normalizeMessages(
parsed.messages,
safePlayer.name
),

choices:
chapterMode ===
"milestone_choice"
?
normalizeChapterChoices(
parsed.choices
)
:
[],

chapterComplete:
chapterComplete,

summary:
chapterComplete
?
normalizeSummary(
parsed.summary,
chapterNumber,
activeChapterPlan,
officialChoicesThisChapter
)
:
null,

isFallback:false

};

}
catch(error){

console.error(
"Chapter generation or JSON parsing failed:",
error
);

if(aiText){

console.error(
"Raw AI response:",
aiText
);

}

return createFallbackChapterResponse(
chapterMode,
action,
{

currentChapter:
chapterNumber,

isFinalChapter:
isFinalChapter,

currentBeat:
chapterBeat.current,

nextBeat:
chapterBeat.next,

cliffhanger:
activeChapterPlan.cliffhanger ||
"",

chapterTitle:
activeChapterPlan.title ||
"Chapter " + chapterNumber,

inputType:
normalizedInputType,

officialChoices:
officialChoicesThisChapter

}
);

}

}

module.exports = {
playChapter
};
