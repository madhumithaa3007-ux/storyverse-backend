
const { callGemini } = require("./geminiClient");
const { TANGLISH_STYLE } = require("./languageStyle");

function clip(value, max = 1000) {
  return String(value ?? "").trim().slice(0, max);
}

function wordCount(value) {
  const text = String(value || "").replace(/\*[^*]*\*/g, " ");
  const words = text.match(
    /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu
  );

  return words ? words.length : 0;
}

// Supports both string and object responses from Gemini.
function extractText(result) {
  if (typeof result === "string") {
    return result.trim();
  }

  if (!result || typeof result !== "object") {
    return "";
  }

  const text =
    result.text ??
    result.response ??
    result.reply ??
    "";

  return typeof text === "string" ? text.trim() : "";
}

// Prevents cutting a reply in the middle of a sentence
// whenever a reasonable sentence boundary is available.
function limitReply(value, maxChars) {
  const text = String(value ?? "").trim();

  if (text.length <= maxChars) {
    return text;
  }

  const part = text.slice(0, maxChars + 1);

  const boundary = Math.max(
    part.lastIndexOf(". "),
    part.lastIndexOf("! "),
    part.lastIndexOf("? "),
    part.lastIndexOf("\n")
  );

  if (boundary >= maxChars * 0.65) {
    return part.slice(0, boundary + 1).trim();
  }

  const lastSpace = part.lastIndexOf(" ");

  const safeEnd = lastSpace > 0 ? lastSpace : maxChars;

  return part.slice(0, safeEnd).trimEnd() + "…";
}

// Determine the appropriate reply length from the user's
// message and conversational intent.
function getReplySettings(message) {
  const text = String(message || "").trim();
  const lower = text.toLowerCase();
  const words = wordCount(text);
  const questionCount = (text.match(/\?/g) || []).length;

  const explicitlyShort =
    /\b(keep it short|short answer|briefly|in one sentence|one line|few words|don't elaborate|do not elaborate|just yes or no|yes or no only|one word only)\b/i.test(lower);

  const explicitlyDetailed =
    /\b(in detail|detailed explanation|explain|elaborate|tell me more|go deeper|describe|continue the story|continue the scene|what happens next|step by step|long reply|write a story|tell me a story)\b/i.test(lower);

  const simpleGreeting =
    /^(?:hi+|hey+|hello+|vanakkam|good morning|good evening|good night)(?:\s+there)?[!.,\s]*$/i.test(text);

  const complexQuestion =
    /\b(why|how|explain|describe|what happened|what do you mean|tell me about|help me understand|compare|step by step)\b/i.test(lower);

  const longMessage =
    text.length >= 260 ||
    words >= 45 ||
    questionCount >= 2;

  const narrativeRequest =
    /\b(continue the story|continue the scene|what happens next|describe the scene|write a scene|roleplay this)\b/i.test(lower);

  // Level 1: Brief conversational replies.
  if (
    explicitlyShort ||
    simpleGreeting ||
    (words <= 4 && text.length <= 28 && questionCount === 0)
  ) {
    return {
      level: "short",
      maxOutputTokens: 70,
      maxChars: 350,
      instruction:
        "Give a brief, natural reply, usually 1 sentence. " +
        "Use only as much dialogue or action as the moment needs. " +
        "Do not add unnecessary narration."
    };
  }

  // Level 3: Detailed responses when the situation needs them.
  if (
    explicitlyDetailed ||
    longMessage ||
    narrativeRequest ||
    (complexQuestion && words >= 12)
  ) {
    return {
      level: "detailed",
      maxOutputTokens: 250,
      maxChars: 1500,
      instruction:
        "Give a fuller, context-aware reply. Address the important " +
        "parts of the user's message, respond to their emotions, " +
        "and use meaningful dialogue or brief actions where appropriate. " +
        "Several sentences are fine when needed, but do not ramble " +
        "or repeat yourself."
    };
  }

  // Level 2: Default everyday conversation.
  return {
    level: "normal",
    maxOutputTokens: 130,
    maxChars: 750,
    instruction:
      "Usually reply in 1–3 natural sentences. Add detail when " +
      "the conversation benefits from it, but keep simple exchanges " +
      "concise. Let the character's personality guide the response."
  };
}

// Check whether the reply is genuinely too short for the context.
function needsRetry(reply, settings, message) {
  if (!reply || wordCount(reply) === 0) {
    return true;
  }

  const words = wordCount(reply);

  // Short replies are acceptable for short conversations.
  if (settings.level === "short") {
    return false;
  }

  // Normal conversation only needs a basic complete response.
  if (settings.level === "normal") {
    return words < 2;
  }

  // Avoid forcing lengthy replies to ordinary yes/no questions.
  const directYesNoQuestion =
    /^\s*(can|could|do|does|did|is|are|was|were|will|would|should|have|has|had|am)\b/i.test(message) &&
    message.includes("?");

  const emotionalMessage =
    /\b(love|miss|hurt|scared|afraid|sad|angry|leave|trust|betray|sorry|cry|heartbroken|jealous|worried)\b/i.test(message);

  if (directYesNoQuestion && !emotionalMessage) {
    return false;
  }

  // Detailed prompts should not receive an unnecessarily tiny reply.
  return words < 8;
}

async function chatWithStandaloneCharacter(data = {}) {
  const character = data.character || {};
  const persona = data.userPersona || data.persona || {};

  const message = clip(data.message, 1200);
  const scene = clip(
    data.chatScene || data.activeScene,
    600
  );

  const history = Array.isArray(data.chatHistory)
    ? data.chatHistory
        .slice(-10)
        .map((m) => ({
          role:
            m.type === "user" || m.role === "user"
              ? "user"
              : "model",
          text: clip(m.text || m.content, 500)
        }))
        .filter((m) => m.text)
    : [];

  if (!character.name) {
    throw new Error(
      "Standalone character information is missing."
    );
  }

  if (!message) {
    throw new Error("Chat message is required.");
  }

  const settings = getReplySettings(message);

  const prompt = `${TANGLISH_STYLE}

You are roleplaying as the fictional standalone character below in StoryVerse AI.

This is an independent character chat. It is not connected to any story, chapter, or story memory.

CHARACTER PROFILE
Name: ${clip(character.name, 100)}
Age: ${clip(character.age, 40)}
Gender: ${clip(character.gender, 40)}
Occupation: ${clip(character.occupation, 100)}
Role/personality: ${clip(character.role, 120)}
Traits: ${clip(character.traits, 300)}
Speech style: ${clip(character.speechStyle, 180)}
Relationship style: ${clip(character.relationshipStyle, 120)}
Backstory: ${clip(character.backstory, 900)}
Profile: ${clip(character.profile, 900)}
Likes: ${clip(character.likes, 200)}
Dislikes: ${clip(character.dislikes, 200)}
Hobbies: ${clip(character.hobbies, 200)}
Fears: ${clip(character.fears, 200)}
Special rules: ${clip(character.rules, 500)}

USER'S SELECTED PERSONA
Name: ${clip(persona.name || persona.displayName || "User", 100)}
Role: ${clip(persona.role, 100)}
Occupation: ${clip(persona.occupation, 100)}
Traits: ${clip(persona.traits || persona.personality, 250)}
Profile: ${clip(persona.profile, 350)}

ACTIVE SCENE
${scene || "No scene has been set. Continue naturally from the latest message."}

ROLEPLAY RULES
- Stay in character and respond directly to the latest user message.
- The selected persona is the person chatting. Never control the user's actions, thoughts, feelings, or dialogue.
- Use the character's personality, backstory, relationships, and speech style consistently.
- Adapt reply length to the conversational situation, not just the number of words in the user's message.
- Reply briefly to greetings, acknowledgements, simple questions, and casual exchanges.
- Use enough detail for complex questions, emotional conversations, arguments, confessions, suspense, and meaningful roleplay scenes.
- Address multiple questions or important points when appropriate.
- A long user message does not automatically require a long reply. A short emotional message may still deserve a thoughtful response.
- Do not pad replies, repeat information, or add unnecessary narration just to make a reply longer.
- Respect explicit requests for short answers or detailed explanations.
- ${settings.instruction}
- Do not answer with only one word or an emoji unless the user explicitly requests it or the context genuinely calls for it.
- Use natural actions between single asterisks, such as *smiles softly* or *looks away*. Keep actions brief and never narrate the user's actions.
- Use relevant emojis naturally in casual conversations when they fit. Avoid forcing emojis into every reply or serious scenes.
- Keep dialogue emotionally responsive and avoid repetitive filler.
- Follow the requested Tanglish style.
- Return only the character's message. No headings, JSON, or explanations.

RECENT CHAT
${JSON.stringify(history)}

LATEST USER MESSAGE
${message}

CHARACTER REPLY:`;

  // First generation using the context-sensitive token limit.
  const result = await callGemini(prompt, {
    temperature: 0.78,
    maxOutputTokens: settings.maxOutputTokens
  });

  let cleaned = limitReply(
    extractText(result),
    settings.maxChars
  );

  // Retry only when the reply is empty or clearly too short
  // for the type of conversation.
  if (needsRetry(cleaned, settings, message)) {
    const correctionPrompt = `${prompt}

RESPONSE REVISION
Your previous draft was empty or too short for this conversation.
Generate a fresh, complete in-character reply.
${settings.instruction}
Do not mention the revision or these instructions.
Do not use a generic fallback greeting.
Return only the character's actual message.`;

    const correctionResult = await callGemini(
      correctionPrompt,
      {
        temperature: 0.7,
        maxOutputTokens: settings.maxOutputTokens
      }
    );

    const corrected = limitReply(
      extractText(correctionResult),
      settings.maxChars
    );

    // Prefer the correction if it fixes the issue.
    // If it is still short but non-empty, use whichever reply
    // contains more meaningful words instead of inventing a fallback.
    if (
      corrected &&
      (
        !needsRetry(corrected, settings, message) ||
        wordCount(corrected) > wordCount(cleaned)
      )
    ) {
      cleaned = corrected;
    }
  }

  // Never return a fake character reply when generation fails.
  // The caller can display an error without adding it to chat history.
  if (!cleaned) {
    throw new Error(
      "The character could not generate a reply. Please try again."
    );
  }

  return cleaned;
}

module.exports = { chatWithStandaloneCharacter };
