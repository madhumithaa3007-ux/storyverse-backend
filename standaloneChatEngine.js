const { callGemini } = require("./geminiClient");
const { TANGLISH_STYLE } = require("./languageStyle");

function clip(value, max=1000) { return String(value ?? "").trim().slice(0, max); }
function wordCount(value) {
  const text = String(value || "").replace(/\*[^*]*\*/g, " ");
  const words = text.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu);
  return words ? words.length : 0;
}

async function chatWithStandaloneCharacter(data = {}) {
  const character = data.character || {};
  const persona = data.userPersona || data.persona || {};
  const message = clip(data.message, 1200);
  const scene = clip(data.chatScene || data.activeScene, 600);
  const history = Array.isArray(data.chatHistory) ? data.chatHistory.slice(-10).map(m => ({
    role: m.type === "user" || m.role === "user" ? "user" : "model",
    text: clip(m.text || m.content, 500)
  })).filter(m => m.text) : [];
  if (!character.name) throw new Error("Standalone character information is missing.");
  if (!message) throw new Error("Chat message is required.");

  const prompt = `${TANGLISH_STYLE}\n\nYou are roleplaying as the fictional standalone character below in StoryVerse AI. This is an independent character chat, not connected to any story, chapter, or story memory.\n\nCHARACTER PROFILE\nName: ${clip(character.name,100)}\nAge: ${clip(character.age,40)}\nGender: ${clip(character.gender,40)}\nOccupation: ${clip(character.occupation,100)}\nRole/personality: ${clip(character.role,120)}\nTraits: ${clip(character.traits,300)}\nSpeech style: ${clip(character.speechStyle,180)}\nRelationship style: ${clip(character.relationshipStyle,120)}\nBackstory: ${clip(character.backstory,900)}\nProfile: ${clip(character.profile,900)}\nLikes: ${clip(character.likes,200)}\nDislikes: ${clip(character.dislikes,200)}\nHobbies: ${clip(character.hobbies,200)}\nFears: ${clip(character.fears,200)}\nSpecial rules: ${clip(character.rules,500)}\n\nUSER'S SELECTED PERSONA\nName: ${clip(persona.name || persona.displayName || "User",100)}\nRole: ${clip(persona.role,100)}\nOccupation: ${clip(persona.occupation,100)}\nTraits: ${clip(persona.traits || persona.personality,250)}\nProfile: ${clip(persona.profile,350)}\n\nACTIVE SCENE\n${scene || "No scene has been set. Continue naturally from the user's latest message."}\n\nROLEPLAY RULES\n- Stay in character and respond directly to the user's latest message.\n- The selected persona is the person chatting; never control the user's actions, thoughts, or dialogue.\n- Use the character's backstory and personality consistently, but reveal private details naturally rather than dumping them.\n- Keep ordinary replies concise: usually 1–4 complete sentences, and shorter for greetings or simple messages.\n- Never answer with only one word or only an emoji unless the user explicitly asks for a one-word answer or sends only an emoji. Even a greeting should receive a complete friendly phrase.\n- Use 1–2 relevant emojis naturally in most casual replies (around 60–80%); avoid them in serious scenes when they do not fit. Do not repeat the same emoji every time.\n- Natural actions are allowed, written between single asterisks, e.g. *smiles softly* or *shakes your hand*. Use brief actions sparingly and do not narrate the user's actions.\n- Keep dialogue natural and emotionally responsive. Avoid repetitive filler and excessive narration.\n- Follow the requested Tanglish style.\n- Return only the character's message, with no heading, JSON, or explanation.\n\nRECENT CHAT\n${JSON.stringify(history)}\n\nLATEST USER MESSAGE\n${message}\n\nCHARACTER REPLY:`;
  const result = await callGemini(prompt, { temperature: 0.78, maxOutputTokens: 150 });
  const reply = typeof result === "string" ? result : (result && (result.text || result.response || result.reply)) || "";
  let cleaned = clip(reply, 1200);
  if (!cleaned) throw new Error("The character could not generate a reply. Please try again.");

  if (wordCount(cleaned) < 3 && !/\b(one word|single word|just yes or no)\b/i.test(message)) {
    const correction = await callGemini(
      prompt + "\n\nRESPONSE QUALITY CHECK: Your last draft was too short. Reply with at least one complete natural sentence (at least 5 meaningful words for a greeting). Do not send a single word or emoji alone. Preserve the character's personality and use a relevant emoji naturally if it fits.",
      { temperature: 0.7, maxOutputTokens: 90 }
    );
    const corrected = clip(correction, 1200);
    if (corrected && wordCount(corrected) >= 3) cleaned = corrected;
    else cleaned = "Hey, sollu, enna nadandhuchu? 😊";
  }
  return cleaned;
}
module.exports = { chatWithStandaloneCharacter };
