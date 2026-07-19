const { callGemini } =
require("./geminiClient");


/*
==================================================
TEXT HELPERS
==================================================
*/

function cleanText(
value,
maximumLength = 500
){

const text =
String(
value ?? ""
)
.trim();

if(!text){

return "";

}

if(
text.length <=
maximumLength
){

return text;

}

return (
text
.slice(
0,
maximumLength
)
.trimEnd()
+
"…"
);

}


/*
==================================================
MEMORY COMPRESSION
==================================================
*/

function compactMemory(
items,
limit = 18
){

if(
!Array.isArray(
items
)
){

return [];

}

return items
.slice(
-limit
)
.map(item=>{

if(
typeof item ===
"string"
){

return {

type:
"memory",

text:
cleanText(
item,
320
)

};

}

if(
!item ||
typeof item !==
"object"
){

return null;

}

return {

type:
cleanText(
item.type ||
item.role ||
"memory",
40
),

speaker:
cleanText(
item.speaker ||
item.character ||
item.characterName ||
"",
80
),

text:
cleanText(
item.text ||
item.message ||
item.narration ||
item.summary ||
"",
360
)

};

})
.filter(item=>{

return (
item &&
item.text
);

});

}


/*
==================================================
RELATIONSHIP NUMBER
==================================================
*/

function relationshipNumber(
value,
fallback
){

const number =
Number(
value
);

return Number.isFinite(
number
)
?
number
:
fallback;

}


/*
==================================================
OFFLINE / API FAILURE FALLBACK REPLY
==================================================
*/

function buildFallbackReply({

character,

user,

message,

scene,

relationship

}){

const characterName =
cleanText(
character.name,
80
) ||
"I";

const userName =
cleanText(
user.name ||
user.displayName,
80
);

const latestMessage =
cleanText(
message,
180
);

const activeScene =
cleanText(
scene,
220
);

const trust =
relationshipNumber(
relationship.trust,
50
);

const romance =
relationshipNumber(
relationship.romance,
0
);

const suspicion =
relationshipNumber(
relationship.suspicion,
0
);

let opening;

if(
suspicion >= 65
){

opening =
"I heard you, but I am not ready to accept that without questions.";

}
else if(
romance >= 60
){

opening =
"I am trying to stay calm, but what you said matters to me more than I want to admit.";

}
else if(
trust >= 65
){

opening =
"I believe you are being honest with me, so I am listening.";

}
else{

opening =
"I heard what you said, and I need a moment to understand what you really mean.";

}

const sceneLine =
activeScene
?
"In this moment, I do not want us to avoid what is happening between us."
:
"I do not want to give you an empty answer just to end the conversation.";

const closing =
latestMessage
?
(
userName
?
userName + ", "
:
""
)
+
"say it plainly—what do you need from " +
characterName +
" right now?"
:
"Tell me what you are really trying to say.";

return (
opening +
" " +
sceneLine +
" " +
closing
);

}


/*
==================================================
PROMPT BUILDER
==================================================
*/

function buildPrompt({

story,

user,

playerCharacter,

currentChapter,

scene,

storyMemory,

chatHistory,

character,

message,

relationship,

compact = false

}){

const sceneActive =
Boolean(
scene
);

const storyContext =
compact
?
(
cleanText(
story.title,
100
)
+
" | " +
cleanText(
story.genre,
60
)
)
:
JSON.stringify({

title:
cleanText(
story.title,
100
),

genre:
cleanText(
story.genre,
60
),

summary:
cleanText(
story.story ||
story.summary ||
story.fullStory,
1000
),

currentChapter:
currentChapter ||
1

});

const characterContext =
JSON.stringify({

name:
cleanText(
character.name,
80
),

age:
cleanText(
character.age,
30
),

role:
cleanText(
character.role,
100
),

occupation:
cleanText(
character.occupation,
100
),

traits:
cleanText(
character.traits,
240
),

speechStyle:
cleanText(
character.speechStyle,
120
),

relationshipStyle:
cleanText(
character.relationshipStyle,
120
),

strengths:
cleanText(
character.strengths,
180
),

weaknesses:
cleanText(
character.weaknesses,
180
),

likes:
cleanText(
character.likes,
180
),

dislikes:
cleanText(
character.dislikes,
180
),

hobbies:
cleanText(
character.hobbies,
180
),

fears:
cleanText(
character.fears,
160
),

profile:
cleanText(
character.profile,
compact
?
420
:
700
),

rules:
cleanText(
character.rules,
320
),

secretType:
cleanText(
character.secretType,
100
)

});

const userContext =
JSON.stringify({

name:
cleanText(
user.name ||
user.displayName,
80
)
||
"User",

role:
cleanText(
user.role,
100
)
||
"Player",

occupation:
cleanText(
user.occupation,
100
),

traits:
cleanText(
user.traits ||
user.personality,
220
),

speechStyle:
cleanText(
user.speechStyle,
120
),

relationshipStyle:
cleanText(
user.relationshipStyle,
120
),

likes:
cleanText(
user.likes,
160
),

dislikes:
cleanText(
user.dislikes,
160
),

fears:
cleanText(
user.fears,
140
),

profile:
cleanText(
user.profile ||
user.bio,
500
),

rules:
cleanText(
user.rules,
240
)

});

const playerContext =
JSON.stringify({

name:
cleanText(
playerCharacter.name,
80
),

role:
cleanText(
playerCharacter.role,
100
),

profile:
cleanText(
playerCharacter.profile,
350
)

});

return `

You are roleplaying as one fictional StoryVerse character.

Return only the character's reply as plain text.

Do not return JSON.
Do not return markdown.
Do not include headings.
Do not include explanations.
Do not place quotation marks around the entire reply.
Never say you are an AI.

IMPORTANT USER PERSONA RULE

The person chatting is the USER PERSONA.

Do not automatically treat the user as the story main character.

The story main character is background context unless the user persona is the same person.

CONVERSATION MODE

${
sceneActive
?
"CUSTOM SCENE CHAT"
:
"NORMAL STORY CHAT"
}

ACTIVE SCENE

${
sceneActive
?
cleanText(
scene,
500
)
:
"No custom scene is active."
}

SCENE RULES

- When a custom scene is active, remain completely inside that scene.
- Use the scene-specific chat history as the primary memory.
- Preserve the scene's emotional state, conflict, closeness, tension and unresolved details.
- Do not continue the normal chapter timeline while scene mode is active.
- Never call the scene temporary, fake, imagined, alternate or non-canon.
- Never explain that the scene is separate from the original story.
- When no scene is active, continue naturally from the story and normal chat history.

STORY CONTEXT

${storyContext}

STORY MAIN CHARACTER BACKGROUND

${playerContext}

USER PERSONA

${userContext}

CHARACTER YOU ARE PLAYING

${characterContext}

RELATIONSHIP STATE

Trust:
${
relationshipNumber(
relationship.trust,
50
)
}

Friendship:
${
relationshipNumber(
relationship.friendship,
50
)
}

Romance:
${
relationshipNumber(
relationship.romance,
0
)
}

Suspicion:
${
relationshipNumber(
relationship.suspicion,
0
)
}

RECENT STORY MEMORY

${
JSON.stringify(
sceneActive
?
[]
:
storyMemory
)
}

PREVIOUS CHAT MEMORY

${
JSON.stringify(
chatHistory
)
}

ROLEPLAY RULES

- Stay completely in character.
- Reply directly to the user's latest message.
- Speak only as the character.
- Do not narrate the user's actions.
- Do not narrate the user's thoughts.
- Do not decide what the user feels or does.
- Do not write dialogue for the user.
- Avoid stage directions unless one very short gesture is necessary.
- Use the character's personality and speech style naturally.
- Use the user's persona when deciding how the character addresses them.
- Keep continuity with earlier messages.
- Do not repeat an earlier reply.
- Do not merely repeat or paraphrase the user's message.
- Let trust, friendship, romance and suspicion affect warmth and openness.
- Keep secrets hidden unless the conversation naturally earns a reveal.
- Write between 2 and 5 natural sentences.
- Aim for approximately 45 to 110 words.
- Do not give an incomplete or abruptly ending reply.
- Avoid generic filler.
- Every reply should show emotion, tension, concern, affection, suspicion, humour or conflict.

LATEST USER MESSAGE

${
cleanText(
message,
900
)
}

CHARACTER REPLY:

`;

}


/*
==================================================
GEMINI REQUEST
==================================================
*/

async function requestReply(
prompt,
options
){

const result =
await callGemini(
prompt,
options
);

return cleanText(
result,
1600
);

}


/*
==================================================
MAIN CHARACTER CHAT FUNCTION
==================================================
*/

async function chatWithCharacter(
data
){

const safeData =
data ||
{};

const story =
safeData.story ||
{};

const user =
safeData.userPersona ||
safeData.persona ||
safeData.user ||
{};

const playerCharacter =
safeData.playerCharacter ||
{};

const character =
safeData.character ||
{};

const message =
cleanText(
safeData.message,
900
);

const scene =
cleanText(
safeData.chatScene,
500
);

const relationship =
character.relationship ||
{

trust:50,

friendship:50,

romance:0,

suspicion:0

};

if(!message){

throw new Error(
"Chat message is required."
);

}

if(!character.name){

throw new Error(
"Character information is missing."
);

}

const sceneActive =
Boolean(
scene
);


/*
Do not send normal story memory when
the user is inside a custom scene.
*/

const storyMemory =
compactMemory(

sceneActive
?
[]
:
safeData.storyMemory,

16

);


/*
Use only the latest relevant chat history.
This prevents excessive Gemini input tokens.
*/

const chatHistory =
compactMemory(

safeData.chatHistory,

22

);


/*
==================================================
FIRST GEMINI ATTEMPT
==================================================
*/

const primaryPrompt =
buildPrompt({

story:
story,

user:
user,

playerCharacter:
playerCharacter,

currentChapter:
safeData.currentChapter,

scene:
scene,

storyMemory:
storyMemory,

chatHistory:
chatHistory,

character:
character,

message:
message,

relationship:
relationship,

compact:
false

});

try{

const reply =
await requestReply(
primaryPrompt,
{

temperature:
0.82,

maxOutputTokens:
320

}
);

if(reply){

return reply;

}

throw new Error(
"Gemini returned an empty chat reply."
);

}


/*
==================================================
SECOND SMALLER GEMINI ATTEMPT
==================================================
*/

catch(firstError){

console.error(
"Primary character chat generation failed:"
);

console.error(
firstError.message ||
firstError
);

const retryPrompt =
buildPrompt({

story:
story,

user:
user,

playerCharacter:
playerCharacter,

currentChapter:
safeData.currentChapter,

scene:
scene,

storyMemory:
storyMemory.slice(
-8
),

chatHistory:
chatHistory.slice(
-10
),

character:
character,

message:
message,

relationship:
relationship,

compact:
true

});

try{

const retryReply =
await requestReply(
retryPrompt,
{

temperature:
0.72,

maxOutputTokens:
220

}
);

if(retryReply){

return retryReply;

}

throw new Error(
"Gemini retry returned an empty reply."
);

}


/*
==================================================
LOCAL FALLBACK RESPONSE
==================================================

If Gemini quota, network or model access fails,
return a character-style reply instead of making
the frontend display “Unable to get a reply”.
*/

catch(retryError){

console.error(
"Character chat retry failed:"
);

console.error(
retryError.message ||
retryError
);

return buildFallbackReply({

character:
character,

user:
user,

message:
message,

scene:
scene,

relationship:
relationship

});

}

}

}


module.exports = {

chatWithCharacter

};