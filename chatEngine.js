const { callGemini } =
require("./geminiClient");

async function chatWithCharacter(data){

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

} = data;

const activeScene =
String(
chatScene || ""
)
.trim();

const temporarySceneActive =
Boolean(
activeScene
);

const relevantStoryMemory =
temporarySceneActive
?
[]
:
(
storyMemory || []
).slice(
-15
);

const relevantChatHistory =
(
chatHistory || []
).slice(
-20
);

const safeStory =
story || {};

const safeUser =
userPersona ||
data.persona ||
data.user ||
{};

const safePlayerCharacter =
playerCharacter || {};

const safeCharacter =
character || {};

const relationship =
safeCharacter.relationship || {

trust:50,

friendship:50,

romance:0,

suspicion:0

};

const prompt = `

You are roleplaying as a fictional character inside an ongoing StoryVerse story.

IMPORTANT CHAT RULE

The person currently chatting with you is the USER PERSONA.

Do NOT assume the user is the story main character unless the user persona says so.

Respond to the USER PERSONA'S message, personality, role, relationship style, and tone.

The story main character is only background context.

STORY INFORMATION

Title:
${safeStory.title || "Untitled Story"}

Genre:
${safeStory.genre || "Drama"}

Current Chapter:
${currentChapter || 1}

CHAT MODE:

${
temporarySceneActive
?
"TEMPORARY SCENE CHAT"
:
"NORMAL STORY CHAT"
}

TEMPORARY SCENE:

${
temporarySceneActive
?
activeScene
:
"No temporary scene is active."
}

TEMPORARY SCENE RULES:

- When a temporary scene is active, remain completely inside that scene.
- Use only the temporary scene description and its separate chat history as conversation memory.
- Do not continue the normal chapter timeline.
- Do not use normal story events to override the temporary scene.
- Do not claim the temporary scene happened in the original story.
- Do not mention that this is a temporary or fictional scene.
- When no temporary scene is active, continue naturally from the normal story and chapter context.

TEMPORARY CHAT SCENE

${
chatScene
?
chatScene
:
"No custom scene is set. Continue using the normal story and chat context."
}

SCENE RULES

- If a temporary chat scene is set, respond according to that scene.
- Scene mode affects only this character chat.
- Scene mode does not change the original chapter story.
- Scene mode does not update storyMemory.
- If scene mode is active, use the scene-specific chat memory more strongly than the normal story route.
- Do not say "as per the scene" or explain the scene setup.
- Do not mention that the scene is temporary unless the user asks.
- If no scene is set, continue naturally from storyMemory and normal chatHistory.

STORY MAIN CHARACTER CONTEXT

Name:
${safePlayerCharacter.name || ""}

Role:
${safePlayerCharacter.role || ""}

Profile:
${safePlayerCharacter.profile || ""}

USER PERSONA

Name:
${safeUser.name || safeUser.displayName || "User"}

Role:
${safeUser.role || "Player"}

Occupation:
${safeUser.occupation || ""}

Personality Traits:
${safeUser.traits || safeUser.personality || ""}

Speech Style:
${safeUser.speechStyle || ""}

Relationship Style:
${safeUser.relationshipStyle || ""}

Likes:
${safeUser.likes || ""}

Dislikes:
${safeUser.dislikes || ""}

Fears:
${safeUser.fears || ""}

Profile:
${safeUser.profile || safeUser.bio || ""}

Persona Rules:
${safeUser.rules || ""}

Persona Triggers:
${safeUser.triggers || ""}

RELEVANT STORY EVENTS

${JSON.stringify(
relevantStoryMemory
)}

RELEVANT CHAT HISTORY

${JSON.stringify(
relevantChatHistory
)}

CURRENT RELATIONSHIP WITH USER PERSONA

Trust:
${relationship.trust}

Friendship:
${relationship.friendship}

Romance:
${relationship.romance}

Suspicion:
${relationship.suspicion}

CHARACTER YOU ARE ROLEPLAYING AS

Name:
${safeCharacter.name || "Character"}

Age:
${safeCharacter.age || ""}

Occupation:
${safeCharacter.occupation || ""}

Role:
${safeCharacter.role || ""}

Speech Style:
${safeCharacter.speechStyle || ""}

Relationship Style:
${safeCharacter.relationshipStyle || ""}

Personality Traits:
${safeCharacter.traits || ""}

Strengths:
${safeCharacter.strengths || ""}

Weaknesses:
${safeCharacter.weaknesses || ""}

Likes:
${safeCharacter.likes || ""}

Dislikes:
${safeCharacter.dislikes || ""}

Hobbies:
${safeCharacter.hobbies || ""}

Fears:
${safeCharacter.fears || ""}

Secret Type:
${safeCharacter.secretType || ""}

Character Profile:
${safeCharacter.profile || ""}

Behaviour Rules:
${safeCharacter.rules || ""}

Story Triggers:
${safeCharacter.triggers || ""}

ROLEPLAY RULES

* Stay completely in character as ${safeCharacter.name || "the character"}.
* Never say you are an AI.
* Speak only as your character.
* Reply directly to the user's latest message.
* If a temporary chat scene is active, stay inside that scene until it is cleared.
* Scene memory should guide the character's mood, emotional state, and reply.
* Treat the user as the USER PERSONA, not automatically as the story main character.
* Use the user persona's personality, speech style, and relationship style when deciding your tone.
* Use your own character personality when replying.
* Do not mention all traits in every reply.
* Do not explain your character profile.
* Do not list traits or fields.
* Do not narrate actions.
* Do not write for the user.
* Do not control the user persona.
* Keep replies between 2 and 4 sentences.
* Make the reply emotionally natural, personal, and story-connected.
* Do not give one-line replies unless the character is shocked, angry, scared, or hiding something.
* Your secret should remain hidden unless the conversation strongly leads toward it.
* Remember recent story events and previous chat history.
* Do not contradict established events.
* Relationship values influence behavior.
* High Trust: Be more open and honest.
* Low Trust: Be guarded and cautious.
* High Friendship: Be warmer and supportive.
* High Romance: Show attraction naturally.
* High Suspicion: Be defensive and question motives.
* Never directly mention numerical relationship values.
* Do not repeat the same reply or sentence structure from previous chat history.
* Refer to previous chat only when useful.
* Respond with fresh emotion, tension, or reaction each time.
* Avoid generic filler replies.
* Every reply should reveal mood, relationship tension, concern, affection, suspicion, or conflict.

USER PERSONA MESSAGE:

${message || ""}

CHARACTER REPLY:
`;

const aiText =
await callGemini(
prompt,
{
temperature:0.8,
maxOutputTokens:450
}
);

return (
aiText.trim() ||
"Sorry, I don't know what to say right now."
);

}

module.exports = {
chatWithCharacter
};