const { callGemini } =
require("./geminiClient");


/*
==================================================
TEXT HELPERS
==================================================
*/

function cleanText(
value,
maximumLength = 1200
){

const result =
String(
value ?? ""
)
.trim();

if(!result){

return "";

}

if(
result.length <=
maximumLength
){

return result;

}

return (
result
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
entries,
limit
){

if(
!Array.isArray(
entries
)
){

return [];

}

return entries
.slice(
-limit
)
.map(entry=>{

if(
typeof entry ===
"string"
){

return {

type:
"memory",

text:
cleanText(
entry,
320
)

};

}

if(
!entry ||
typeof entry !==
"object"
){

return null;

}

const memoryText =
cleanText(

entry.text ||
entry.message ||
entry.narration ||
entry.summary ||
"",

360

);

if(!memoryText){

return null;

}

return {

type:
cleanText(
entry.type ||
entry.role ||
"memory",
40
),

speaker:
cleanText(

entry.speaker ||
entry.character ||
entry.characterName ||
"",

80

),

text:
memoryText

};

})
.filter(Boolean);

}


/*
==================================================
ADAPTIVE REPLY LENGTH
==================================================
*/

function getReplyProfile(
message
){

const text =
String(
message || ""
)
.trim();

const lower =
text.toLowerCase();

const words =
text
?
text
.split(/\s+/)
.filter(Boolean)
.length
:
0;

const questionCount =
(
text.match(/\?/g) ||
[]
).length;


/*
Very simple greetings and acknowledgements.
*/

const simpleGreeting =
/^(hi|hello|hey|hii+|heyy+|good morning|good afternoon|good evening|good night|thanks|thank you|okay|ok|yes|no|sure|fine)[.!?\s]*$/i
.test(
text
);


/*
Messages that usually need an explanation.
*/

const needsExplanation =
/(why|how|explain|tell me|what happened|what do you mean|how could|can we talk|be honest|truth|confess|because)/i
.test(
lower
);


/*
Short emotional messages may still need
more than a one-line response.
*/

const emotionallyHeavy =
/(love|hate|betray|betrayed|hurt|leave|left me|miss you|sorry|forgive|afraid|scared|angry|jealous|trust|breakup|goodbye|never again)/i
.test(
lower
);


if(
simpleGreeting ||
(
words <= 3 &&
questionCount === 0
)
){

return {

mode:
"very_short",

instruction:
"Reply in 1 short, natural sentence. Usually 4 to 18 words. Do not add an unnecessary explanation.",

maxOutputTokens:
70

};

}


if(
words <= 12 &&
questionCount <= 1 &&
!needsExplanation &&
!emotionallyHeavy
){

return {

mode:
"short",

instruction:
"Reply in 1 or 2 natural sentences. Usually 10 to 40 words. Be direct and realistic.",

maxOutputTokens:
110

};

}


if(
words <= 45 &&
questionCount <= 2
){

return {

mode:
"normal",

instruction:
"Reply in 2 to 4 natural sentences. Usually 25 to 85 words. Use only the detail needed for this moment.",

maxOutputTokens:
210

};

}


return {

mode:
"detailed",

instruction:
"Reply in 3 to 6 natural sentences. Usually 60 to 150 words. Address the important points without padding or repeating the user.",

maxOutputTokens:
340

};

}


/*
==================================================
EMERGENCY FALLBACK REPLY
==================================================

Used only when Gemini fails twice.
It also follows adaptive reply length.
*/

function buildFallbackReply({

message,

scene,

relationship,

profile

}){

const lower =
String(
message || ""
)
.toLowerCase();

const trust =
Number(
relationship.trust ??
50
);

const romance =
Number(
relationship.romance ??
0
);

const suspicion =
Number(
relationship.suspicion ??
0
);


if(
profile.mode ===
"very_short"
){

if(
/thank/.test(
lower
)
){

return (
"You don’t have to thank me."
);

}

if(
/^(hi|hello|hey|hii+|heyy+)/i
.test(
message
)
){

return (
"Hey. What’s on your mind?"
);

}

return (
"I’m here. Go on."
);

}


if(
suspicion >= 65
){

return (
"I heard you, but I’m not ready to accept that without questions. Tell me what you are leaving out."
);

}


if(
romance >= 60
){

return scene
?
(
"I’m trying to stay calm, but this moment matters to me more than I want to admit. Tell me what you really want from us."
)
:
(
"What you said matters to me more than I want to admit. Just be honest with me now."
);

}


if(
trust >= 65
){

return (
"I believe you’re trying to be honest with me. Say the rest plainly—I’m listening."
);

}


if(
profile.mode ===
"detailed"
){

return (
"I’m listening, but I don’t want to answer with something empty. Tell me what brought you to this point, and I’ll answer you honestly."
);

}


return (
"I heard you. Tell me what you really mean."
);

}


/*
==================================================
PROMPT BUILDER
==================================================
*/

function buildPrompt({

story,

userPersona,

playerCharacter,

currentChapter,

chatScene,

storyMemory,

chatHistory,

character,

message,

relationship,

replyProfile

}){

const sceneActive =
Boolean(
chatScene
);

return `

You are roleplaying as one fictional character in StoryVerse.

Return only the character's reply as plain text.

Do not return JSON.
Do not use markdown.
Do not add a heading.
Do not place quotation marks around the entire reply.
Never say you are an AI.

IMPORTANT USER RULE

The person chatting is the USER PERSONA.

Do not automatically treat the user as the story main character.

The story main character is background context unless the persona is the same person.

STORY CONTEXT

Title:
${
cleanText(
story.title,
100
) ||
"Untitled Story"
}

Genre:
${
cleanText(
story.genre,
60
) ||
"Drama"
}

Current Chapter:
${currentChapter || 1}

Story Summary:

${
cleanText(

story.story ||
story.summary ||
story.fullStory,

1000

)
}

STORY MAIN CHARACTER BACKGROUND

${
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
420
)

})
}

USER PERSONA

${
JSON.stringify({

name:
cleanText(

userPersona.name ||
userPersona.displayName ||
"User",

80

),

role:
cleanText(
userPersona.role ||
"Player",
100
),

occupation:
cleanText(
userPersona.occupation,
100
),

traits:
cleanText(

userPersona.traits ||
userPersona.personality,

220

),

speechStyle:
cleanText(
userPersona.speechStyle,
120
),

relationshipStyle:
cleanText(
userPersona.relationshipStyle,
120
),

profile:
cleanText(

userPersona.profile ||
userPersona.bio,

500

)

})
}

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
chatScene,
500
)
:
"No custom scene is active. Continue from normal story and chat context."
}

SCENE RULES

- When a custom scene is active, remain fully inside that scene until it is cleared.
- Treat the scene and scene-specific history as the primary reality of this conversation.
- Preserve the emotional state, closeness, conflict, distrust or tension already created in the scene.
- Do not continue the normal chapter timeline while scene mode is active.
- Never call the scene temporary, fake, imagined, alternate or non-canon.
- When no scene is active, continue naturally from normal story memory and normal chat history.

CHARACTER YOU ARE PLAYING

${
JSON.stringify({

name:
cleanText(
character.name ||
"Character",
80
),

age:
cleanText(
character.age,
30
),

occupation:
cleanText(
character.occupation,
100
),

role:
cleanText(
character.role,
100
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

traits:
cleanText(
character.traits,
240
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
160
),

dislikes:
cleanText(
character.dislikes,
160
),

hobbies:
cleanText(
character.hobbies,
160
),

fears:
cleanText(
character.fears,
140
),

secretType:
cleanText(
character.secretType,
100
),

profile:
cleanText(
character.profile,
700
),

rules:
cleanText(
character.rules,
300
)

})
}

CURRENT RELATIONSHIP

Trust:
${Number(relationship.trust ?? 50)}

Friendship:
${Number(relationship.friendship ?? 50)}

Romance:
${Number(relationship.romance ?? 0)}

Suspicion:
${Number(relationship.suspicion ?? 0)}

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

ADAPTIVE REPLY LENGTH

${replyProfile.instruction}

REPLY LENGTH RULES

- Match the length and emotional weight of the user's message.
- A greeting, acknowledgement, teasing line or simple question should receive a short reply.
- A short input does not automatically need a paragraph.
- Use a longer reply only when the user asks for an explanation, sends a confession, raises several points, or the emotional moment genuinely needs detail.
- Never pad a reply just to make it longer.
- Never cut an important emotional answer short merely to make it brief.
- Do not repeat information simply to increase reply length.

ROLEPLAY RULES

- Stay completely in character.
- Reply directly to the latest message before adding anything else.
- Speak only as the character.
- Do not narrate or control the user.
- Do not write dialogue for the user.
- Avoid stage directions unless one very short gesture is essential.
- Use the character's speech style naturally.
- Keep continuity with previous messages.
- Do not repeat an earlier reply.
- Do not merely paraphrase the user's message.
- Let trust, friendship, romance and suspicion influence warmth and openness.
- Keep secrets hidden unless the conversation naturally earns a reveal.
- Avoid generic filler.
- End the reply naturally and completely.

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
MAIN CHAT FUNCTION
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

const userPersona =

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

const chatScene =
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
chatScene
);

const replyProfile =
getReplyProfile(
message
);


/*
Do not send normal story memory while
inside a custom scene.
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
Use the selected normal or scene-specific
chat history sent by character-chat.html.
*/

const chatHistory =
compactMemory(

safeData.chatHistory,

22

);


const prompt =
buildPrompt({

story:
story,

userPersona:
userPersona,

playerCharacter:
playerCharacter,

currentChapter:
safeData.currentChapter,

chatScene:
chatScene,

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

replyProfile:
replyProfile

});


/*
==================================================
FIRST GEMINI ATTEMPT
==================================================
*/

try{

const aiText =
await callGemini(
prompt,
{

temperature:
0.82,

maxOutputTokens:
replyProfile.maxOutputTokens

}
);

const reply =
cleanText(
aiText,
1800
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
SECOND GEMINI ATTEMPT
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

userPersona:
userPersona,

playerCharacter:
playerCharacter,

currentChapter:
safeData.currentChapter,

chatScene:
chatScene,

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

replyProfile:
replyProfile

});


try{

const retryText =
await callGemini(
retryPrompt,
{

temperature:
0.72,

maxOutputTokens:
Math.min(

replyProfile.maxOutputTokens,

220

)

}
);

const retryReply =
cleanText(
retryText,
1800
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
EMERGENCY LOCAL REPLY
==================================================
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

message:
message,

scene:
chatScene,

relationship:
relationship,

profile:
replyProfile

});

}

}

}


module.exports = {

chatWithCharacter

};