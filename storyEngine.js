const { callGemini } =
require("./geminiClient");

async function generateStory(storyData){

const title =
storyData.title || "Untitled Story";

const genre =
storyData.genre || "Drama";

const mood =
storyData.mood || "Emotional";

const theme =
storyData.theme || "Secrets and Lies";

const worldSetting =
storyData.worldSetting || "Modern City";

const romanceType =
storyData.romanceType || "Slow Burn";

const conflictType =
storyData.conflictType || "Hidden Secret";

const storyLength =
storyData.storyLength || "20";

const endingCount =
storyData.endingCount || "3";

const idea =
storyData.idea || "A character enters a life-changing story full of emotion, secrets, and difficult choices.";

const prompt = `

You are StoryVerse AI.

Create content for an interactive story game.

Return ONLY valid JSON.
Do not include markdown.
Do not include explanation outside JSON.
Do not wrap JSON in code blocks.

The user has created a story idea. Your job is to generate:

1. A short story preview
2. A suggested character cast with complete character input data

STORY INPUTS

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

Story Length:
${storyLength} chapters

Ending Count:
${endingCount}

Story Idea:
${idea}

OUTPUT JSON FORMAT

{
  "storyPreview":"Short story preview here",
  "suggestedCharacters":[
    {
      "name":"Character Name",
      "age":"Age",
      "gender":"Male/Female/Other",
      "occupation":"Occupation",
      "role":"Role in Story",
      "traits":"Trait 1, Trait 2, Trait 3",
      "speechStyle":"Speech Style",
      "relationshipStyle":"Relationship Style",
      "strengths":"Strength 1, Strength 2, Strength 3",
      "weaknesses":"Weakness 1, Weakness 2, Weakness 3",
      "likes":"Like 1, Like 2, Like 3",
      "dislikes":"Dislike 1, Dislike 2, Dislike 3",
      "hobbies":"Hobby 1, Hobby 2",
      "fears":"Fear 1, Fear 2",
      "secretType":"Secret Type",
      "rules":"Short behaviour rules",
      "profile":"Character preview paragraph"
    }
  ]
}

STORY PREVIEW RULES

- Write the storyPreview in 150 to 220 words.
- It should feel like a story game preview.
- Include emotional hook, main conflict, mystery, romance tension, and setting.
- Do not write Chapter 1.
- Do not reveal the full ending.
- Do not explain every twist.
- Do not make it too long.
- Do not end abruptly.

SUGGESTED CHARACTER RULES

- Create 5 to 8 characters.
- Characters must fit the story idea.
- Must include one Main Character.
- Must include at least one Love Interest if romance type is relevant.
- Must include supporting characters useful for drama, mystery, conflict, or emotional development.
- At least one character must have a secret.
- Do not make all characters similar.
- Give each character a useful role in the story.
- Keep character profiles between 80 and 130 words each.

USE ONLY THESE ROLE OPTIONS WHEN POSSIBLE

Main Character,
Love Interest,
Best Friend,
Main Character's Mother,
Main Character's Father,
Main Character's Brother,
Main Character's Sister,
Main Character's Cousin,
Main Character's Childhood Friend,
Main Character's Mentor,
Main Character's Boss,
Main Character's Ex,
Love Interest's Mother,
Love Interest's Father,
Love Interest's Brother,
Love Interest's Sister,
Love Interest's Best Friend,
Love Interest's Ex,
Rival,
Villain,
Guardian,
Teacher,
Colleague,
Detective,
Mystery Stranger

USE ONLY THESE SPEECH STYLE OPTIONS WHEN POSSIBLE

Formal,
Casual,
Polite,
Friendly,
Professional,
Confident,
Calm,
Gentle,
Cheerful,
Playful,
Flirtatious,
Sarcastic,
Teasing,
Blunt,
Direct,
Reserved,
Shy,
Mysterious,
Elegant,
Charming,
Witty,
Passionate,
Emotional,
Protective,
Authoritative

USE ONLY THESE RELATIONSHIP STYLE OPTIONS WHEN POSSIBLE

Friendly,
Romantic,
Reserved,
Tsundere,
Protective,
Supportive,
Affectionate,
Loyal,
Trusting,
Independent,
Shy,
Playful,
Flirtatious,
Possessive,
Jealous,
Suspicious,
Guarded,
Manipulative,
Competitive,
Devoted,
Forgiving,
Emotionally Distant,
Protective Mentor,
Secret Admirer,
Childhood Companion,
Rival Turned Ally,
Obsessively Attached,
Teasing,
Respectful,
Dependable

USE ONLY THESE SECRET TYPE OPTIONS WHEN POSSIBLE

Family Secret,
Identity Secret,
Love Secret,
Hidden Past,
Medical Secret,
Criminal Secret,
Corporate Secret,
Government Secret,
Supernatural Secret,
Lost Heir Secret,
Double Life Secret,
Hidden Relationship,
Blackmail Secret,
Forbidden Power,
Secret Child,
Unknown Parentage,
Memory Loss Secret,
Witness Protection,
Revenge Secret,
Inheritance Secret,
Hidden Wealth,
Secret Organization,
Former Criminal,
Secret Marriage,
False Identity,
Buried Evidence,
Hidden Sibling,
Secret Mission,
Murder Witness,
Royal Bloodline

IMPORTANT

Return JSON only.
The JSON must be valid.
The suggestedCharacters value must be an array.

`;

const aiText =
await callGemini(
prompt,
{
temperature:0.8,
responseMimeType:"application/json",
maxOutputTokens:2500
}
);

try{

let cleaned =
aiText
.replace(/```json/g,"")
.replace(/```/g,"")
.trim();

const firstBrace =
cleaned.indexOf("{");

const lastBrace =
cleaned.lastIndexOf("}");

if(
firstBrace !== -1 &&
lastBrace !== -1
){

cleaned =
cleaned.substring(
firstBrace,
lastBrace + 1
);

}

const parsed =
JSON.parse(cleaned);

return {

storyPreview:
parsed.storyPreview || "",

suggestedCharacters:
Array.isArray(parsed.suggestedCharacters)
?
parsed.suggestedCharacters
:
[]

};

}

catch(error){

console.error(
"Story JSON Parse Error:"
);

console.error(error);

console.error(
"Raw AI Response:"
);

console.error(aiText);

return {

storyPreview:
aiText,

suggestedCharacters:
[]

};

}

}

module.exports = {
generateStory
};