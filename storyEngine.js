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

Create a STORY BLUEPRINT.

DO NOT write Chapter 1.

DO NOT write the full story.

Create only:

1. Story Summary
2. Main Plot
3. Suggested Character Roles
4. Story Structure
5. Ending Possibilities

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

Rules:

- Story must end within ${storyLength} chapters.
- Do not create character names.
- Refer to characters as:
  Main Character
  Love Interest
  Friend
  Parent
  Rival
  Villain
- Create a reusable story framework.
- Include long-term unresolved mysteries that can develop across chapters.
- Include emotional and relationship arcs that can grow gradually.
- Include story hooks that can support milestone choices.
- The structure should support cliffhanger chapter endings.
- Do not resolve major secrets too early.
- Keep response under 500 words.

`;

return await callGemini(
prompt,
{
temperature:0.8,
maxOutputTokens:700
}
);

}

module.exports = {
generateStory
};