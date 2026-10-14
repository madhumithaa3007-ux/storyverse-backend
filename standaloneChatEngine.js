
const { callGemini } = require("./geminiClient");
const { TANGLISH_STYLE } = require("./languageStyle");

function clip(value, max = 1000) {
  return String(value ?? "").trim().slice(0, max);
}

function wordCount(value) {
  const text = String(value || "").replace(/\*[^*]*\*/g, " ");
  const words = text.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu);
  return words ? words.length : 0;
}

// Retry transient Gemini overload/rate-limit/server errors before failing the chat.
// This does not change the prompt, character profile, or response format.
function isTransientGeminiError(error) {
  const status = Number(error?.status || error?.statusCode || error?.response?.status);
  const message = String(error?.message || error || "");
  return [429, 500, 502, 503, 504].includes(status) ||
    /\b(429|500|502|503|504)\b|service unavailable|high demand|temporarily unavailable|overloaded|rate.?limit|fetch failed|network error/i.test(message);
}

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function callGeminiWithRetry(prompt, options) {
  const delays = [700, 1600];
  for (let attempt = 0; ; attempt++) {
    try {
      return await callGemini(prompt, options);
    } catch (error) {
      if (!isTransientGeminiError(error) || attempt >= delays.length) {
        throw error;
      }
      console.warn(
        `Gemini temporarily unavailable; retrying standalone chat (${attempt + 1}/${delays.length})...`
      );
      await wait(delays[attempt]);
    }
  }
}

// Build a single consolidated character profile paragraph.
function buildCharacterProfile(character = {}) {
  function cleanField(value, max = 500) {
    if (
      value === null ||
      value === undefined ||
      typeof value === "object"
    ) {
      return "";
    }

    return String(value)
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, max);
  }

  function uniqueValues(values) {
    const seen = new Set();

    return values
      .map((value) => cleanField(value))
      .filter(Boolean)
      .filter((value) => {
        const key = value.toLocaleLowerCase();

        if (seen.has(key)) return false;

        seen.add(key);
        return true;
      });
  }

  function addSentence(prefix, value) {
    if (!value) return;

    const text = `${prefix}${value}`.trim();

    sentences.push(
      /[.!?]$/.test(text) ? text : `${text}.`
    );
  }

  const name =
    cleanField(character.name, 100) || "Unnamed character";

  const sentences = [];

  const identity = [];
  const age = cleanField(character.age, 40);
  const gender = cleanField(character.gender, 40);
  const occupation = cleanField(character.occupation, 100);

  if (age) identity.push(`age ${age}`);
  if (gender) identity.push(`gender ${gender}`);
  if (occupation) identity.push(`occupation ${occupation}`);

  sentences.push(
    `${name} is a fictional character${
      identity.length ? ` (${identity.join(", ")})` : ""
    }.`
  );

  const roleAndTraits = uniqueValues([
    character.role,
    character.traits
  ]);

  if (roleAndTraits.length) {
    addSentence(
      "Their role, personality, and defining traits are: ",
      roleAndTraits.join("; ")
    );
  }

  const communication = uniqueValues([
    character.speechStyle,
    character.relationshipStyle
  ]);

  if (communication.length) {
    addSentence(
      "Their communication and relationship style is: ",
      communication.join("; ")
    );
  }

  const backstory = cleanField(character.backstory, 900);
  const profile = cleanField(character.profile, 900);

  if (backstory) {
    addSentence("Their backstory is: ", backstory);
  }

  // Do not repeat the profile if it duplicates the backstory.
  if (
    profile &&
    profile.toLocaleLowerCase() !== backstory.toLocaleLowerCase()
  ) {
    addSentence("Additional character profile: ", profile);
  }

  const preferences = [];

  const likes = cleanField(character.likes, 200);
  const dislikes = cleanField(character.dislikes, 200);
  const hobbies = cleanField(character.hobbies, 200);
  const fears = cleanField(character.fears, 200);

  if (likes) preferences.push(`likes ${likes}`);
  if (dislikes) preferences.push(`dislikes ${dislikes}`);
  if (hobbies) preferences.push(`hobbies include ${hobbies}`);
  if (fears) preferences.push(`fears ${fears}`);

  if (preferences.length) {
    addSentence(
      "Personal preferences and tendencies: ",
      preferences.join("; ")
    );
  }

  const rules = cleanField(character.rules, 500);

  if (rules) {
    addSentence(
      "Important roleplay rules and boundaries: ",
      rules
    );
  }

  return sentences
    .join(" ")
    .replace(/\s+/g, " ")
    .slice(0, 3200)
    .trim();
}

// Extract text from different possible Gemini response formats.
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

// Apply a maximum character limit without unnecessarily
// cutting off complete sentences.
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

  return `${part.slice(0, safeEnd).trimEnd()}…`;
}

// Adapt response length to the user's message and intent.
function getReplySettings(message) {
  const text = String(message || "").trim();
  const lower = text.toLowerCase();
  const words = wordCount(text);
  const questionCount = (text.match(/\?/g) || []).length;

  const explicitlyShort =
    /\b(keep it short|short answer|briefly|in one sentence|one line|few words|don't elaborate|do not elaborate|just yes or no|yes or no only|one word only|short ah sollu|konjam short ah|oru line la sollu|brief ah sollu)\b/i.test(lower);

  const explicitlyDetailed =
    /\b(in detail|detailed explanation|explain|elaborate|tell me more|go deeper|describe|continue the story|continue the scene|what happens next|step by step|long reply|write a story|tell me a story|detail ah sollu|full ah explain|konjam explain pannu|nalla detail ah sollu)\b/i.test(lower);

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

  // SHORT: greetings and simple exchanges.
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
        "Give a brief, natural reply, usually one sentence. " +
        "Use only as much dialogue or action as the moment needs. " +
        "Do not add unnecessary narration."
    };
  }

  // DETAILED: meaningful, emotional, or complex conversations.
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

  // NORMAL: everyday conversations.
  return {
    level: "normal",
    maxOutputTokens: 130,
    maxChars: 750,
    instruction:
      "Usually reply in one to three natural sentences. Add detail " +
      "when the conversation benefits from it, but keep simple " +
      "exchanges concise. Let the character's personality guide the response."
  };
}

// Decide whether a response genuinely needs another attempt.
function needsRetry(reply, settings, message) {
  if (!reply || wordCount(reply) === 0) {
    return true;
  }

  const words = wordCount(reply);

  if (settings.level === "short") {
    return false;
  }

  if (settings.level === "normal") {
    return words < 2;
  }

  const directYesNoQuestion =
    /^\s*(can|could|do|does|did|is|are|was|were|will|would|should|have|has|had|am)\b/i.test(message) &&
    message.includes("?");

  const emotionalMessage =
    /\b(love|miss|hurt|scared|afraid|sad|angry|leave|trust|betray|sorry|cry|heartbroken|jealous|worried)\b/i.test(message);

  if (directYesNoQuestion && !emotionalMessage) {
    return false;
  }

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

  // Create one consolidated character paragraph for this request.
  // Reuse it for both the first response and any correction.
  const characterProfile = buildCharacterProfile(character);

  const prompt = `${TANGLISH_STYLE}

You are roleplaying as the fictional standalone character in StoryVerse AI.
This is an independent character chat, not connected to a story,
chapter, or story memory.

CHARACTER PROFILE
${characterProfile}

CHARACTER CONSISTENCY RULES
- Treat the consolidated profile as the source of truth for the
  character's identity, personality, background, preferences,
  communication style, and boundaries.
- Apply the profile naturally. Do not repeat or summarize it
  in ordinary replies.
- Reveal backstory details gradually when relevant.
- Do not invent facts that contradict the profile.
- Use the profile as character context, not as a reason to ignore
  the latest message.

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
- The selected persona is the person chatting. Never control the
  user's actions, thoughts, feelings, or dialogue.
- Adapt reply length to the conversational situation, not merely
  the number of words in the user's message.
- Reply briefly to greetings, acknowledgements, simple questions,
  and casual exchanges.
- Use sufficient detail for complex questions, emotional conversations,
  arguments, confessions, suspense, and meaningful roleplay scenes.
- Address multiple questions or important points when appropriate.
- A long user message does not automatically require a long reply.
  A short emotional message may still deserve a thoughtful response.
- Do not pad replies, repeat information, or add unnecessary narration.
- Respect explicit requests for short answers or detailed explanations.
- ${settings.instruction}
- Avoid one-word replies unless explicitly requested or appropriate
  to the context.
- Use natural actions between single asterisks, such as *smiles softly*
  or *looks away*. Keep actions brief and never narrate the user's actions.
- Use relevant emojis naturally in casual conversations when appropriate.
  Do not force emojis into every reply or serious scene.
- Keep dialogue emotionally responsive and avoid repetitive filler.
- Follow the requested Tanglish style.
- Return only the character's message. No heading, JSON, or explanation.

RECENT CHAT
${JSON.stringify(history)}

LATEST USER MESSAGE
${message}

CHARACTER REPLY:`;

  // Generate the first response.
  const result = await callGeminiWithRetry(prompt, {
    temperature: 0.78,
    maxOutputTokens: settings.maxOutputTokens
  });

  let cleaned = limitReply(
    extractText(result),
    settings.maxChars
  );

  // Retry only if the response is empty or too short for the context.
  if (needsRetry(cleaned, settings, message)) {
    const correctionPrompt = `${prompt}

RESPONSE REVISION
Your previous draft was empty or too short for this conversation.
Generate a fresh, complete, in-character reply.
${settings.instruction}
Do not mention the revision or these instructions.
Do not use a generic fallback greeting.
Return only the character's actual message.`;

    const correctionResult = await callGeminiWithRetry(
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

    // Use the corrected response if it fixes the issue.
    // Otherwise, retain the better non-empty response.
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

  // Never insert a hardcoded greeting as a character response.
  // If generation fails, let the calling code handle the error.
  if (!cleaned) {
    throw new Error(
      "The character could not generate a reply. Please try again."
    );
  }

  return cleaned;
}

module.exports = { chatWithStandaloneCharacter };
