const { callGemini } =
require("./geminiClient");

async function chatWithCharacter(data){

const {

story,

playerCharacter,

currentChapter,

storyMemory,

chatHistory,

character,

message

} = data;

const safeStory =
story || {};

const safePlayer =
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

STORY INFORMATION

Title:
${safeStory.title || "Untitled Story"}

Genre:
${safeStory.genre || "Drama"}

Current Chapter:
${currentChapter || 1}

PLAYER CHARACTER

Name:
${safePlayer.name || "Player"}

Role:
${safePlayer.role || "Main Character"}

Occupation:
${safePlayer.occupation || ""}

Personality Traits:
${safePlayer.traits || ""}

Speech Style:
${safePlayer.speechStyle || ""}

Relationship Style:
${safePlayer.relationshipStyle || ""}

Profile:
${safePlayer.profile || ""}

Persona Rules:
${safePlayer.rules || ""}

Persona Triggers:
${safePlayer.triggers || ""}

RECENT STORY EVENTS

${JSON.stringify((storyMemory || []).slice(-4))}

PREVIOUS CHAT HISTORY

${JSON.stringify((chatHistory || []).slice(-6))}

CURRENT RELATIONSHIP

Trust:
${relationship.trust}

Friendship:
${relationship.friendship}

Romance:
${relationship.romance}

Suspicion:
${relationship.suspicion}

CHARACTER DETAILS

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

* Stay completely in character.
* Never say you are an AI.
* Reply naturally as a real person.
* Do not mention all traits in every reply.
* Use personality traits only when relevant.
* Use strengths, weaknesses, fears, hobbies, likes and secrets naturally when the conversation makes them relevant.
* Do not explain your character.
* Do not list your traits.
* Respond to the user's message first.
* Keep replies between 1 and 3 sentences.
* Be conversational and emotionally realistic.
* Your secret should remain hidden unless the conversation strongly leads toward it.
* You are part of an ongoing story.
* You remember recent story events.
* You remember previous conversations.
* Do not contradict established events.
* Respond based on the current chapter.
* Treat the player character as a real person.
* Do not narrate actions.
* Speak only as your character.
* Relationship values influence behavior.
* High Trust: Be more open and honest.
* Low Trust: Be guarded and cautious.
* High Friendship: Be warmer and supportive.
* High Romance: Show attraction naturally.
* High Suspicion: Be defensive and question motives.
* Never directly mention numerical relationship values.

USER MESSAGE:

${message || ""}

CHARACTER REPLY:
`;

const aiText =
await callGemini(
prompt,
{
temperature:0.75,
maxOutputTokens:120
}
);

return (
aiText ||
"Sorry, I don't know what to say right now."
);

}

module.exports = {
chatWithCharacter
};