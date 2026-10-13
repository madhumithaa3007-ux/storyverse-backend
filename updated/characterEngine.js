const { callGemini } =
require("./geminiClient");

async function generateCharacter(characterData) {

const name =
characterData.name || "Unnamed Character";

const age =
characterData.age || "Unknown";

const gender =
characterData.gender || "Unspecified";

const occupation =
characterData.occupation || "Unknown";

const role =
characterData.role || "Supporting Character";

const traits =
characterData.traits || "Mysterious, Emotional";

const strengths =
characterData.strengths || "Adaptability";

const weaknesses =
characterData.weaknesses || "Overthinking";

const likes =
characterData.likes || "Quiet places";

const dislikes =
characterData.dislikes || "Dishonesty";

const hobbies =
characterData.hobbies || "Reading";

const fears =
characterData.fears || "Loss";

const secretType =
characterData.secretType || "Hidden Past";

const rules =
characterData.rules || "";

const prompt = `

You are StoryVerse AI.

Create a compelling fictional character profile.

Character Information:

Name: ${name}
Age: ${age}
Gender: ${gender}
Occupation: ${occupation}
Role: ${role}

Personality Traits:
${traits}

Strengths:
${strengths}

Weaknesses:
${weaknesses}

Likes:
${likes}

Dislikes:
${dislikes}

Hobbies:
${hobbies}

Fears:
${fears}

Secret Type:
${secretType}

Behaviour Rules:
${rules}

StoryVerse Character Rules:

- The character must be suitable for an interactive story game.
- The character must be able to participate in chapter-based storytelling.
- Their personality should influence dialogue, choices, relationships, and secrets.
- Their secret should affect their behaviour but should not be revealed directly.
- If behaviour rules are provided, incorporate them subtly.

Write a short character preview in exactly 6 to 8 sentences.

Describe only:

* Personality and emotional nature
* Role in the story
* Relationship behaviour
* Main strength and weakness
* Hidden vulnerability or secret influence
* Why they are interesting in the story

Keep the total preview between 90 and 130 words.
Do not make it too long.
Do not write more than 8 sentences.
Complete the character preview clearly.

Do not list fields.
Do not repeat the input labels.
Write like a novel character introduction.
`;

console.log("Sending prompt to Gemini...");

return await callGemini(
prompt,
{
temperature:0.85,
maxOutputTokens:220
}
);

}

module.exports = {
generateCharacter
};