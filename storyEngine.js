const { callGemini } =
require("./geminiClient");

async function generateStory(
storyData
){

const title =
storyData.title || "Untitled Story";

const genre =
storyData.genre || "Drama";

const mood =
storyData.mood || "Emotional";

const theme =
storyData.theme || "Self Discovery";

const worldSetting =
storyData.worldSetting || "Modern City";

const romanceType =
storyData.romanceType || "Slow Burn";

const conflictType =
storyData.conflictType || "Internal Conflict";

const storyLength =
storyData.storyLength || "10";

const endingCount =
storyData.endingCount || "3";

const idea =
storyData.idea || "A character begins a life-changing journey.";

const prompt = `

You are StoryVerse AI.

Create a short story preview for an interactive story game.

Do NOT write Chapter 1.
Do NOT write the full story.
Do NOT create full scenes.
Do NOT make it too long.
Do NOT end abruptly.

Story Title:
${title}

Genre:
${genre}

Mood:
${mood}

Theme:
${theme}

World Setting:
${worldSetting}

Romance Type:
${romanceType}

Conflict Type:
${conflictType}

Maximum Chapters:
${storyLength}

Number Of Endings:
${endingCount}

Story Idea:
${idea}

Output Format:

STORY PREVIEW:
Write a clear and engaging story preview in 150 to 220 words.
It should feel like the short description shown before starting a story game.
Include the main conflict, emotional hook, mystery, romance tension, and world setting.
Do not reveal the full ending.
Do not explain every twist.
Make the player curious to start the story.

SUGGESTED CHARACTERS:
List 5 to 8 suggested characters for this story.

For each character, use this format:

- Role: Main Character
  Purpose: Short purpose in the story

- Role: Love Interest
  Purpose: Short purpose in the story

Character suggestions must use role-based names only.
Do not create actual names.

Good role examples:
Main Character
Love Interest
Best Friend
Main Character's Mother
Main Character's Father
Love Interest's Mother
Love Interest's Father
Rival
Villain
Mystery Stranger
Mentor
Detective
Colleague

Rules:

- Keep the total response under 600 words.
- Keep it simple, clear, and useful for the next character creation step.
- Do not write chapters.
- Do not write a full plot breakdown.
- Do not include ending details.
- Do not use markdown tables.
- The response must contain only STORY PREVIEW and SUGGESTED CHARACTERS.

`;

return await callGemini(
prompt,
{
temperature:0.8,
maxOutputTokens:2200
}
);

}

module.exports = {
generateStory
};