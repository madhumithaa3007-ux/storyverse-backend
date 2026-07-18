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

const events =
Array.isArray(
chapterPlan.keyEvents
)
?
chapterPlan.keyEvents
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
action
){

const safeSummary =
summary &&
typeof summary ===
"object"
?
summary
:
{};

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

importantChoices:
Array.isArray(safeSummary.importantChoices)
?
safeSummary.importantChoices
.map(item=>shortenText(item,220))
.filter(Boolean)
.slice(0,8)
:
(
action
?
[shortenText(action,220)]
:
[]
),

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
chapterTitle = ""

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

narration:
"The consequences of the last decision finally come into focus. " +
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
"A major turning point changed the direction of the story."
],

importantChoices:
action
?
[action]
:
[],

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

const narrationByMode = {

normal:
"The scene shifts in direct response to your decision. " +
(
currentBeat ||
"A nearby character reacts, making it clear that the choice has changed what happens next."
),

milestone_choice:
"Your decision changes the balance of the moment. " +
(
currentBeat ||
"Several paths open, each carrying a different emotional or practical cost."
),

cliffhanger_build:
"The tension sharpens as a small detail takes on a more dangerous meaning. " +
(
nextBeat ||
cliffhanger ||
"Someone is about to reveal something that cannot be taken back."
)

};

return {

mode:
chapterMode,

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
storyMemory

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

const chapterBeat =
getChapterBeat(
activeChapterPlan,
interactionCount
);

const relevantStoryMemory =
buildMemoryWindow(
storyMemory,
22,
6
);

const relevantChoices =
buildMemoryWindow(
importantChoices,
12,
4
);

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

CHAPTER ROUTE

Title: ${activeChapterPlan.title || "Untitled Chapter"}
Goal: ${activeChapterPlan.goal || "Move the story toward its planned turning point."}
Setting: ${activeChapterPlan.setting || ""}
Key Events: ${JSON.stringify(activeChapterPlan.keyEvents || [])}
Emotional Focus: ${activeChapterPlan.emotionalFocus || ""}
Required Reveal: ${activeChapterPlan.requiredReveal || ""}
Choice Route Guidance: ${activeChapterPlan.choiceImpact || ""}
Planned Cliffhanger: ${activeChapterPlan.cliffhanger || ""}

CURRENT PLANNED BEAT
${chapterBeat.current}

NEXT PLANNED BEAT
${chapterBeat.next}

PLAYER CHARACTER

${JSON.stringify(compactCharacter(safePlayer))}

PLAYER CONTROL RULE

The real player controls ${safePlayer.name || "the player character"}.
Never create dialogue, private thoughts, decisions, or new voluntary actions for the player character.
You may describe only visible consequences affecting the player and reactions from other characters.

NON-PLAYER CHARACTERS

${JSON.stringify(nonPlayerCharacters)}

RELEVANT STORY MEMORY

${JSON.stringify(relevantStoryMemory)}

IMPORTANT CHOICES

${JSON.stringify(relevantChoices)}

PLAYER'S LATEST ACTION

${action || ""}

OUTPUT FORMAT

{
  "mode":"${chapterMode}",
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

- The latest player action must cause a visible consequence, reaction, clue, obstacle, opportunity, or emotional shift.
- Follow the chapter route and current planned beat. Do not create a random side plot.
- Use one concrete sensory detail when it improves the scene.
- Give each speaking character a recognisable voice based on personality and speech style.
- Use brief body language, facial reactions, pauses, movement, and interruption from non-player characters.
- Refer naturally to earlier choices when they matter.
- Let relationships affect warmth, suspicion, jealousy, trust, humour, distance, or vulnerability.
- Alternate tension, warmth, mystery, humour, awkwardness, silence, and conflict instead of making every scene equally dramatic.
- Do not repeatedly begin with weather, silence, atmosphere, or a character's name.
- Do not repeat facts the player already knows.
- Do not use generic filler. Every response must move the story toward the chapter goal.
- Do not speak or decide for the player character.

NORMAL MODE

- Write 45 to 85 words of narration in one short paragraph.
- Focus on the immediate consequence of the player's action.
- Include 0 to 2 dialogue messages from non-player characters when useful.
- Each dialogue message may contain 1 to 3 natural sentences.
- choices must be [].
- chapterComplete must be false.

MILESTONE CHOICE MODE

- Write 35 to 65 words of narration.
- Present exactly four choices and stop.
- Choice types must be exactly: emotional, relationship, mystery, risky.
- Each choice must be distinct and relevant to the current scene.
- choices must contain exactly four objects.
- chapterComplete must be false.

CLIFFHANGER BUILD MODE

- Write 65 to 110 words.
- Increase suspense and emotional pressure.
- Move toward the required reveal and planned cliffhanger without completing the chapter yet.
- choices must be [].
- chapterComplete must be false.

CHAPTER FINALE MODE

- Write 100 to 170 words.
- Pay off the chapter goal and current beat.
- End on the planned cliffhanger or an earned variation caused by prior choices.
- Do not provide choices.
- chapterComplete must be true.
- summary must contain chapterTitle, keyEvents, importantChoices, relationshipChanges, characterDevelopments, currentMysteries, and cliffhangerDescription.
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
0.78
:
0.72,
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
500
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

narration:
shortenText(
parsed.narration ||
"",
chapterMode ===
"chapter_finale"
?
1600
:
900
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
action
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
"Chapter " + chapterNumber

}
);

}

}

module.exports = {
playChapter
};
