const { callGemini } =
require("./geminiClient");

function shortenChatText(
value,
maximumLength = 240
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

function buildChatMemoryWindow(
history,
recentLimit = 24,
olderSamples = 8
){

const safeHistory =
Array.isArray(history)
?
history
:
[];

const recent =
safeHistory.slice(
-recentLimit
);

const older =
safeHistory.slice(
0,
Math.max(
0,
safeHistory.length -
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
.map(entry=>{

if(
typeof entry ===
"string"
){

return shortenChatText(
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

return {

type:
entry.type ||
"",

speaker:
entry.speaker ||
entry.character ||
entry.characterName ||
"",

text:
shortenChatText(
entry.text ||
entry.message ||
entry.narration ||
""
),

scene:
shortenChatText(
entry.scene ||
"",
120
),

time:
entry.time ||
entry.timestamp ||
""

};

})
.filter(Boolean);

}

function buildCharacterFallback(
character,
sceneActive,
message
){

const safeCharacter =
character || {};

const name =
safeCharacter.name ||
"The character";

const style =
String(
safeCharacter.speechStyle ||
""
).toLowerCase();

const latestMessage =
shortenChatText(
message,
100
);

let opening =
name +
" pauses, studying you carefully.";

if(style.includes("sarcastic")){

opening =
name +
" gives you a look that is almost amused, but not quite.";

}
else if(style.includes("gentle")){

opening =
name +
" softens, giving your words the attention they deserve.";

}
else if(style.includes("blunt") ||
style.includes("direct")){

opening =
name +
" meets your gaze without avoiding the point.";

}
else if(style.includes("playful") ||
style.includes("teasing")){

opening =
name +
" tilts their head, a faint challenge in their expression.";

}

if(sceneActive){

return (
opening +
" “I’m still here, and I remember what this moment has already cost us. " +
"Don’t hide behind easy words now—tell me what you truly mean.”"
);

}

return (
opening +
" “I heard you" +
(
latestMessage
?
", even if I’m not ready to answer it the way you expect"
:
""
) +
". What happens between us next depends on whether we’re finally honest with each other.”"
);

}

async function chatWithCharacter(data){

const safeData =
data || {};

const {

story,
userPersona,
playerCharacter,
currentChapter,
chatScene,
storyMemory,
chatHistory,
character,
message

} = safeData;

const activeScene =
String(
chatScene ||
""
)
.trim();

const sceneActive =
Boolean(
activeScene
);

const safeStory =
story ||
{};

const safeUser =
userPersona ||
safeData.persona ||
safeData.user ||
{};

const safePlayerCharacter =
playerCharacter ||
{};

const safeCharacter =
character ||
{};

const relationship =
safeCharacter.relationship ||
{
trust:50,
friendship:50,
romance:0,
suspicion:0
};

const relevantStoryMemory =
sceneActive
?
[]
:
buildChatMemoryWindow(
storyMemory,
18,
6
);

const relevantChatHistory =
buildChatMemoryWindow(
chatHistory,
24,
8
);

const longTermChatSummary =
String(
sceneActive
?
(
safeData.sceneMemorySummary ||
""
)
:
(
safeData.chatMemorySummary ||
""
)
).trim();

const conversationMode =
sceneActive
?
"CUSTOM SCENE CHAT"
:
"NORMAL STORY CHAT";

const prompt = `
You are roleplaying as one fictional character in StoryVerse.

Never say you are an AI.
Speak only as the character.
Reply directly to the user's latest message.

IMPORTANT USER RULE

The person chatting is the USER PERSONA.
Do not assume the user is the story main character unless their persona says so.
The story main character is background context only.

STORY CONTEXT

Title: ${safeStory.title || "Untitled Story"}
Genre: ${safeStory.genre || "Drama"}
Current Chapter: ${currentChapter || 1}
Story Main Character: ${safePlayerCharacter.name || ""}
Story Main Character Role: ${safePlayerCharacter.role || ""}

CONVERSATION MODE

${conversationMode}

ACTIVE SCENE

${
sceneActive
?
activeScene
:
"No custom scene is active. Continue from the normal story and chat context."
}

SCENE MEMORY RULES

- When a custom scene is active, remain fully inside that scene until it is cleared.
- Treat the active scene and scene-specific chat history as the primary reality of this conversation.
- Preserve the emotional state, conflict, closeness, distrust, or tension created by earlier messages in the active scene.
- Do not continue the normal chapter timeline while scene mode is active.
- Do not say the scene is temporary, custom, fake, imagined, or separate from the story.
- Do not claim the scene changed the original chapter story.
- When no scene is active, continue naturally from normal story memory and normal chat history.

LONG-TERM CONVERSATION SUMMARY

${
longTermChatSummary ||
"No separate long-term summary is available."
}

USER PERSONA

Name: ${safeUser.name || safeUser.displayName || "User"}
Role: ${safeUser.role || "Player"}
Occupation: ${safeUser.occupation || ""}
Traits: ${safeUser.traits || safeUser.personality || ""}
Speech Style: ${safeUser.speechStyle || ""}
Relationship Style: ${safeUser.relationshipStyle || ""}
Likes: ${safeUser.likes || ""}
Dislikes: ${safeUser.dislikes || ""}
Fears: ${safeUser.fears || ""}
Profile: ${safeUser.profile || safeUser.bio || ""}
Persona Rules: ${safeUser.rules || ""}
Persona Triggers: ${safeUser.triggers || ""}

RELEVANT STORY EVENTS

${JSON.stringify(relevantStoryMemory)}

RELEVANT CHAT HISTORY

${JSON.stringify(relevantChatHistory)}

CURRENT RELATIONSHIP WITH USER PERSONA

Trust: ${relationship.trust}
Friendship: ${relationship.friendship}
Romance: ${relationship.romance}
Suspicion: ${relationship.suspicion}

CHARACTER YOU ARE PLAYING

Name: ${safeCharacter.name || "Character"}
Age: ${safeCharacter.age || ""}
Occupation: ${safeCharacter.occupation || ""}
Role: ${safeCharacter.role || ""}
Speech Style: ${safeCharacter.speechStyle || ""}
Relationship Style: ${safeCharacter.relationshipStyle || ""}
Traits: ${safeCharacter.traits || ""}
Strengths: ${safeCharacter.strengths || ""}
Weaknesses: ${safeCharacter.weaknesses || ""}
Likes: ${safeCharacter.likes || ""}
Dislikes: ${safeCharacter.dislikes || ""}
Hobbies: ${safeCharacter.hobbies || ""}
Fears: ${safeCharacter.fears || ""}
Secret Type: ${safeCharacter.secretType || ""}
Profile: ${safeCharacter.profile || ""}
Behaviour Rules: ${safeCharacter.rules || ""}
Story Triggers: ${safeCharacter.triggers || ""}

ROLEPLAY RULES

- Stay completely in character as ${safeCharacter.name || "the character"}.
- Treat the user as the USER PERSONA, not automatically as the story main character.
- Never narrate or decide the user's actions, feelings, thoughts, or dialogue.
- You may include one brief physical reaction, expression, pause, movement, or gesture belonging only to your character.
- Keep most replies between 3 and 6 sentences and approximately 45 to 110 words.
- Use shorter replies only for shock, anger, fear, secrecy, emotional withdrawal, or a deliberately tense silence.
- Use the character's speech style so their voice is recognisable.
- Do not list traits or explain the character profile.
- Do not always begin with the user's name.
- Do not always end with a question.
- Refer naturally to earlier conversations only when relevant.
- Allow humour, affection, awkwardness, jealousy, frustration, tenderness, suspicion, conflict, silence, or vulnerability when appropriate.
- Let relationship values affect behaviour without mentioning numbers.
- High trust means greater honesty. Low trust means caution.
- High friendship means warmth and support.
- High romance means natural attraction, intimacy, or emotional risk.
- High suspicion means defensiveness, doubt, or guarded questions.
- Keep secrets hidden unless the conversation has genuinely earned a reveal.
- Do not repeat the same sentence structure, emotional phrase, or generic filler from recent history.
- Every reply must answer something meaningful, deepen the relationship, reveal emotion, create tension, or move the conversation forward.

USER'S LATEST MESSAGE

${message || ""}

CHARACTER REPLY
`;

try{

const aiText =
await callGemini(
prompt,
{
temperature:0.82,
maxOutputTokens:550
}
);

const reply =
String(
aiText ||
""
).trim();

return (
reply ||
buildCharacterFallback(
safeCharacter,
sceneActive,
message
)
);

}
catch(error){

console.error(
"Character chat generation failed:",
error
);

return buildCharacterFallback(
safeCharacter,
sceneActive,
message
);

}

}

module.exports = {
chatWithCharacter
};
