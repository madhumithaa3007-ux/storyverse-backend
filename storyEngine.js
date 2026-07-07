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
  ],
  "chapterPlan":[
    {
      "chapter":1,
      "title":"Chapter Title",
      "goal":"Main purpose of this chapter",
      "setting":"Main location or atmosphere",
      "keyEvents":[
        "Important event 1",
        "Important event 2",
        "Important event 3"
      ],
      "emotionalFocus":"Main emotion or relationship tension",
      "requiredReveal":"Important clue, truth, danger, or relationship shift that should happen",
      "choiceImpact":"How player choices can change the emotional/mystery/risky route while keeping the base story",
      "cliffhanger":"How this chapter should end"
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

- Create minimum 6 and maximum 8 characters.
- Decide the character count based on story depth:
  - Simple story idea: create exactly 6 characters.
  - Medium-depth story idea: create exactly 7 characters.
  - Deep story with mystery, family conflict, secrets, fantasy, thriller, crime, supernatural, or multiple romance/conflict layers: create exactly 8 characters.
- Never create fewer than 6 characters.
- Never create more than 8 characters.
- Characters must fit the story idea.
- Must include one Main Character.
- Must include at least one Love Interest if romance type is relevant.
- Must include supporting characters useful for drama, mystery, conflict, or emotional development.
- At least one character must have a secret.
- Do not make all characters similar.
- Give each character a useful role in the story.
- Keep character profiles between 70 and 110 words each.

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

CHAPTER PLAN RULES

- Create exactly ${storyLength} chapterPlan objects.
- The chapterPlan must cover the full story from beginning to ending.
- Each chapter must feel connected to the previous chapter.
- Each chapter must have a clear story goal.
- Each chapter must include 3 to 5 keyEvents.
- Each chapter must include one requiredReveal.
- Each chapter must include one cliffhanger.
- The story should feel pre-planned, not random.
- Choices may change emotional route, relationship route, mystery route, or risky route.
- But the base story route must remain consistent.
- Do not resolve the main conflict too early.
- Chapter 1 should introduce the setup, characters, and first major hook.
- Middle chapters should develop secrets, romance, mystery, betrayal, danger, or emotional conflict.
- Final chapters should build toward endings based on choices.
- Keep each chapterPlan object concise but specific.

IMPORTANT

Return JSON only.
The JSON must be valid.
The suggestedCharacters value must be an array.
The chapterPlan value must be an array.

`;

const aiText =
await callGemini(
prompt,
{
temperature:0.8,
responseMimeType:"application/json",
maxOutputTokens:6000
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

const suggestedCharacters =
Array.isArray(parsed.suggestedCharacters)
?
parsed.suggestedCharacters.slice(0,8)
:
[];

const chapterPlan =
Array.isArray(parsed.chapterPlan)
?
parsed.chapterPlan.slice(
0,
parseInt(storyLength) || 20
)
:
[];

return {

storyPreview:
parsed.storyPreview || "",

suggestedCharacters:
suggestedCharacters,

chapterPlan:
chapterPlan

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
[],

chapterPlan:
[]

};

}

}

module.exports = {
generateStory
};