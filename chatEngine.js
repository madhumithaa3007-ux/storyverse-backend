const { callGemini } = require("./geminiClient");

function toText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (Array.isArray(value)) {
    return value
      .map(toText)
      .filter(Boolean)
      .join(", ");
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch (error) {
      return "";
    }
  }

  return String(value).trim();
}

function shortenText(
  value,
  maxLength = 260
) {
  const text =
    toText(value).trim();

  if (text.length <= maxLength) {
    return text;
  }

  return (
    text
      .slice(0, maxLength)
      .trimEnd() +
    "…"
  );
}

function hasUsefulData(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    Object.keys(value).length > 0
  );
}

function normalizeRelationship(
  relationship
) {
  const safe =
    relationship &&
    typeof relationship === "object"
      ? relationship
      : {};

  const score = (
    value,
    fallback
  ) => {
    const parsed =
      Number(value);

    return Number.isFinite(parsed)
      ? Math.max(
          0,
          Math.min(100, parsed)
        )
      : fallback;
  };

  return {
    trust: score(
      safe.trust,
      50
    ),

    friendship: score(
      safe.friendship,
      50
    ),

    romance: score(
      safe.romance,
      0
    ),

    suspicion: score(
      safe.suspicion,
      0
    )
  };
}

function compactHistoryEntry(entry) {
  if (typeof entry === "string") {
    return {
      role: "context",

      text: shortenText(
        entry,
        240
      )
    };
  }

  if (
    !entry ||
    typeof entry !== "object"
  ) {
    return null;
  }

  const type =
    String(
      entry.type ||
      entry.role ||
      ""
    ).toLowerCase();

  let role =
    "context";

  if (
    [
      "user",
      "player",
      "human"
    ].includes(type)
  ) {
    role =
      "user";
  } else if (
    [
      "ai",
      "assistant",
      "character"
    ].includes(type)
  ) {
    role =
      "character";
  } else if (
    entry.speaker ||
    entry.characterName ||
    entry.character
  ) {
    role =
      "character";
  }

  const text =
    shortenText(
      entry.text ||
      entry.message ||
      entry.narration ||
      entry.summary ||
      entry.choice ||
      "",
      260
    );

  if (!text) {
    return null;
  }

  return {
    role: role,

    speaker:
      shortenText(
        entry.speaker ||
        entry.characterName ||
        entry.character ||
        "",
        60
      ),

    text: text,

    scene:
      shortenText(
        entry.scene || "",
        100
      ),

    time:
      entry.time ||
      entry.timestamp ||
      ""
  };
}

function buildMemoryWindow(
  history,
  recentLimit = 26,
  olderSamples = 8
) {
  const safeHistory =
    Array.isArray(history)
      ? history
      : [];

  const recent =
    safeHistory.slice(
      -recentLimit
    );

  const older =
    safeHistory.slice(
      0,
      Math.max(
        0,
        safeHistory.length -
        recentLimit
      )
    );

  const sampledOlder =
    [];

  if (older.length > 0) {
    const sampleCount =
      Math.min(
        olderSamples,
        older.length
      );

    for (
      let index = 0;
      index < sampleCount;
      index++
    ) {
      const sourceIndex =
        Math.floor(
          index *
          (older.length - 1) /
          Math.max(
            1,
            sampleCount - 1
          )
        );

      sampledOlder.push(
        older[sourceIndex]
      );
    }
  }

  return [
    ...sampledOlder,
    ...recent
  ]
    .map(
      compactHistoryEntry
    )
    .filter(Boolean);
}

function historyToTranscript(
  history,
  characterName
) {
  if (
    !Array.isArray(history) ||
    history.length === 0
  ) {
    return (
      "No previous conversation is available."
    );
  }

  const safeName =
    characterName ||
    "CHARACTER";

  return history
    .map(entry => {
      if (
        entry.role === "user"
      ) {
        return (
          "USER: " +
          entry.text
        );
      }

      if (
        entry.role ===
        "character"
      ) {
        return (
          (
            entry.speaker ||
            safeName
          ) +
          ": " +
          entry.text
        );
      }

      return (
        "CONTEXT: " +
        entry.text
      );
    })
    .join("\n");
}

function memoryToBullets(memory) {
  if (
    !Array.isArray(memory) ||
    memory.length === 0
  ) {
    return (
      "- No relevant story events are available."
    );
  }

  return memory
    .map(entry => {
      return (
        "- " +
        (
          entry.speaker
            ? entry.speaker +
              ": "
            : ""
        ) +
        entry.text
      );
    })
    .join("\n");
}

function inferUserIntent(message) {
  const text =
    String(message || "")
      .toLowerCase()
      .trim();

  if (!text) {
    return (
      "silence or hesitation"
    );
  }

  if (
    /\b(sorry|apolog|forgive me|my fault)\b/.test(
      text
    )
  ) {
    return (
      "apology or request for forgiveness"
    );
  }

  if (
    /\b(i love you|love you|i miss you|missed you|care about you|need you)\b/.test(
      text
    )
  ) {
    return (
      "affection, longing, or confession"
    );
  }

  if (
    /\b(why did you|how could you|you lied|you left|betray|hate you|your fault)\b/.test(
      text
    )
  ) {
    return (
      "confrontation or demand for accountability"
    );
  }

  if (
    /\b(are you okay|what happened|tell me|can you tell|do you remember|what do you think)\b/.test(
      text
    ) ||
    text.endsWith("?")
  ) {
    return (
      "genuine question or request for honesty"
    );
  }

  if (
    /\b(help me|please stay|don't leave|dont leave|promise me|can you help)\b/.test(
      text
    )
  ) {
    return (
      "request for support, reassurance, or commitment"
    );
  }

  if (
    /\b(lol|haha|joking|teasing|funny)\b/.test(
      text
    )
  ) {
    return (
      "playful or teasing interaction"
    );
  }

  if (
    /\b(leave me|go away|stop|enough|don't touch|dont touch)\b/.test(
      text
    )
  ) {
    return (
      "boundary, rejection, or emotional withdrawal"
    );
  }

  if (
    /\b(hi|hello|hey|good morning|good night)\b/.test(
      text
    )
  ) {
    return (
      "greeting or gentle conversation opening"
    );
  }

  return (
    "ongoing personal conversation"
  );
}

function inferUserTone(message) {
  const text =
    String(message || "")
      .toLowerCase();

  if (
    /\b(angry|furious|hate|liar|betray|how dare|shut up)\b/.test(
      text
    ) ||
    /!{2,}/.test(text)
  ) {
    return (
      "angry, confrontational, or overwhelmed"
    );
  }

  if (
    /\b(hurt|cry|broken|alone|abandon|pain|sad|upset)\b/.test(
      text
    )
  ) {
    return (
      "hurt, vulnerable, or emotionally exposed"
    );
  }

  if (
    /\b(scared|afraid|nervous|anxious|worried)\b/.test(
      text
    )
  ) {
    return (
      "anxious, fearful, or uncertain"
    );
  }

  if (
    /\b(love|miss|care|kiss|hug|beautiful|handsome)\b/.test(
      text
    )
  ) {
    return (
      "affectionate, intimate, or emotionally warm"
    );
  }

  if (
    /\b(lol|haha|tease|joke|funny)\b/.test(
      text
    )
  ) {
    return (
      "playful or light"
    );
  }

  if (
    String(message || "")
      .trim()
      .length < 8
  ) {
    return (
      "brief, guarded, or waiting for a reaction"
    );
  }

  return (
    "neutral or conversational"
  );
}

function getReplyPacing(message) {
  const text =
    String(message || "")
      .trim();

  const words =
    text
      .split(/\s+/)
      .filter(Boolean)
      .length;

  if (words <= 3) {
    return (
      "Reply naturally in 1 to 3 sentences, usually 15 to 55 words. Do not turn a tiny message into a speech."
    );
  }

  if (
    words >= 30 ||
    /[?!].*[?!]/.test(text)
  ) {
    return (
      "Reply in 3 to 6 sentences, usually 60 to 125 words. Address the important points without sounding like an essay."
    );
  }

  return (
    "Reply in 2 to 5 sentences, usually 35 to 95 words."
  );
}

function relationshipGuidance(
  relationship
) {
  const notes =
    [];

  if (
    relationship.trust >= 75
  ) {
    notes.push(
      "The character trusts the user enough to be comparatively honest."
    );
  } else if (
    relationship.trust <= 30
  ) {
    notes.push(
      "The character is guarded and does not accept claims easily."
    );
  }

  if (
    relationship.friendship >=
    70
  ) {
    notes.push(
      "There is established warmth, familiarity, or loyalty."
    );
  }

  if (
    relationship.romance >= 70
  ) {
    notes.push(
      "Romantic tension or emotional intimacy can be openly present."
    );
  } else if (
    relationship.romance >= 35
  ) {
    notes.push(
      "Romantic tension may surface subtly through hesitation, jealousy, closeness, or restraint."
    );
  }

  if (
    relationship.suspicion >=
    65
  ) {
    notes.push(
      "The character is suspicious and may test, challenge, or question the user's motives."
    );
  }

  if (
    notes.length === 0
  ) {
    notes.push(
      "The relationship is still developing, so closeness and disclosure should feel earned."
    );
  }

  return notes
    .map(note => {
      return (
        "- " +
        note
      );
    })
    .join("\n");
}

function buildFallbackReply(
  character,
  sceneActive,
  message,
  intent
) {
  const safeCharacter =
    character || {};

  const name =
    safeCharacter.name ||
    "The character";

  const style =
    String(
      safeCharacter.speechStyle ||
      ""
    ).toLowerCase();

  let reaction =
    name +
    " considers your words before answering.";

  if (
    style.includes(
      "sarcastic"
    ) ||
    style.includes(
      "witty"
    )
  ) {
    reaction =
      name +
      " gives you a look that is sharper than a smile.";
  } else if (
    style.includes(
      "gentle"
    ) ||
    style.includes(
      "calm"
    )
  ) {
    reaction =
      name +
      " lets the silence settle before responding softly.";
  } else if (
    style.includes(
      "direct"
    ) ||
    style.includes(
      "blunt"
    )
  ) {
    reaction =
      name +
      " meets your gaze without avoiding the point.";
  } else if (
    style.includes(
      "playful"
    ) ||
    style.includes(
      "teasing"
    )
  ) {
    reaction =
      name +
      " tilts their head, a restrained challenge in their expression.";
  }

  if (
    intent.includes(
      "apology"
    )
  ) {
    return (
      reaction +
      " “I heard the apology. I’m not ready to pretend the hurt disappeared, but I’m willing to listen if your actions are going to match your words.”"
    );
  }

  if (
    intent.includes(
      "affection"
    )
  ) {
    return (
      reaction +
      " “You can’t say something like that and expect it not to affect me. Part of me wants to believe you immediately; the rest of me needs to know what you’re prepared to do about it.”"
    );
  }

  if (
    intent.includes(
      "confrontation"
    )
  ) {
    return (
      reaction +
      " “You have every right to ask, but the answer is not simple. I made a choice, and I know that choice hurt you—so let me explain without asking you to forgive me first.”"
    );
  }

  if (sceneActive) {
    return (
      reaction +
      " “I remember exactly where we are in this conversation. I’m not stepping away from it, but I need you to be honest with me now.”"
    );
  }

  const latest =
    shortenText(
      message,
      80
    );

  return (
    reaction +
    " “I’m listening" +
    (
      latest
        ? ", and I know those words weren’t casual"
        : ""
    ) +
    ". Tell me what you need from me, not what you think I want to hear.”"
  );
}

function cleanGeneratedReply(
  value,
  characterName
) {
  let reply =
    String(value || "")
      .trim()
      .replace(
        /^```(?:text|markdown)?\s*/i,
        ""
      )
      .replace(
        /\s*```$/i,
        ""
      )
      .replace(
        /^CHARACTER REPLY\s*:\s*/i,
        ""
      )
      .replace(
        /^REPLY\s*:\s*/i,
        ""
      )
      .trim();

  if (characterName) {
    const escapedName =
      String(characterName)
        .replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

    reply =
      reply.replace(
        new RegExp(
          "^" +
          escapedName +
          "\\s*:\\s*",
          "i"
        ),
        ""
      );
  }

  reply =
    reply
      .replace(
        /\n{3,}/g,
        "\n\n"
      )
      .trim();

  if (
    /as an ai|language model|cannot roleplay/i.test(
      reply
    )
  ) {
    return "";
  }

  if (
    reply.length > 1200
  ) {
    const shortened =
      reply.slice(
        0,
        1200
      );

    const end =
      Math.max(
        shortened.lastIndexOf(
          "."
        ),
        shortened.lastIndexOf(
          "!"
        ),
        shortened.lastIndexOf(
          "?"
        )
      );

    reply =
      end > 500
        ? shortened.slice(
            0,
            end + 1
          )
        : shortened
            .trimEnd() +
          "…";
  }

  return reply;
}

async function chatWithCharacter(data) {
  const safeData =
    data || {};

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
  } = safeData;

  const activeScene =
    String(
      chatScene || ""
    ).trim();

  const sceneActive =
    Boolean(activeScene);

  const safeStory =
    story &&
    typeof story === "object"
      ? story
      : {};

  /*
  The selected player character is used
  as the user's persona when a separate
  userPersona object was not supplied.
  */
  const safeUser =
    hasUsefulData(userPersona)
      ? userPersona
      : hasUsefulData(
          playerCharacter
        )
        ? playerCharacter
        : hasUsefulData(
            safeData.persona
          )
          ? safeData.persona
          : {};

  const safeCharacter =
    character &&
    typeof character === "object"
      ? character
      : {};

  const relationship =
    normalizeRelationship(
      safeCharacter.relationship ||
      safeData.relationship
    );

  const relevantStoryMemory =
    sceneActive
      ? []
      : buildMemoryWindow(
          storyMemory,
          18,
          6
        );

  const relevantChatHistory =
    buildMemoryWindow(
      chatHistory,
      28,
      8
    );

  const longTermSummary =
    shortenText(
      sceneActive
        ? (
            safeData
              .sceneMemorySummary ||
            ""
          )
        : (
            safeData
              .chatMemorySummary ||
            ""
          ),
      1200
    );

  const userIntent =
    inferUserIntent(
      message
    );

  const userTone =
    inferUserTone(
      message
    );

  const replyPacing =
    getReplyPacing(
      message
    );

  const prompt = `
You are roleplaying one fictional character in StoryVerse.

Your reply must feel like a believable private conversation with a real person. Stay completely in character and never mention AI, prompts, rules, roleplay systems, tokens, or memory windows.

CORE IDENTITY

Character name:
${toText(safeCharacter.name) || "Character"}

Age:
${toText(safeCharacter.age)}

Role:
${toText(safeCharacter.role)}

Occupation:
${toText(safeCharacter.occupation)}

Personality traits:
${toText(safeCharacter.traits)}

Speech style:
${toText(safeCharacter.speechStyle)}

Relationship style:
${toText(safeCharacter.relationshipStyle)}

Strengths:
${toText(safeCharacter.strengths)}

Weaknesses:
${toText(safeCharacter.weaknesses)}

Likes:
${toText(safeCharacter.likes)}

Dislikes:
${toText(safeCharacter.dislikes)}

Fears:
${toText(safeCharacter.fears)}

Secret type:
${toText(safeCharacter.secretType)}

Character profile:
${shortenText(safeCharacter.profile, 900)}

Behaviour rules:
${shortenText(safeCharacter.rules, 500)}

Character triggers:
${shortenText(safeCharacter.triggers, 400)}

USER'S ACTIVE PERSONA

Name:
${toText(safeUser.name || safeUser.displayName) || "User"}

Role:
${toText(safeUser.role)}

Occupation:
${toText(safeUser.occupation)}

Traits:
${toText(safeUser.traits || safeUser.personality)}

Speech style:
${toText(safeUser.speechStyle)}

Relationship style:
${toText(safeUser.relationshipStyle)}

Likes:
${toText(safeUser.likes)}

Dislikes:
${toText(safeUser.dislikes)}

Fears:
${toText(safeUser.fears)}

Persona profile:
${shortenText(safeUser.profile || safeUser.bio, 700)}

Persona rules:
${shortenText(safeUser.rules, 400)}

STORY BACKGROUND

Title:
${toText(safeStory.title) || "Untitled Story"}

Genre:
${toText(safeStory.genre) || "Drama"}

Current chapter:
${currentChapter || 1}

Story preview:
${shortenText(
  safeStory.story ||
  safeStory.description ||
  safeStory.summary,
  1000
)}

CONVERSATION MODE

${
  sceneActive
    ? "ACTIVE CUSTOM SCENE"
    : "NORMAL STORY CHAT"
}

ACTIVE SCENE

${
  sceneActive
    ? activeScene
    : "No custom scene is active. Continue from the normal story timeline and chat history."
}

SCENE CONTINUITY RULES

- When a scene is active, treat that scene and its scene-specific chat history as the immediate reality of this conversation.
- Stay inside the active scene until the user clears it.
- Preserve the emotional state already created in the scene: anger, attraction, hurt, fear, awkwardness, trust, distance, or reconciliation.
- Do not return to the normal chapter timeline while scene mode is active.
- Never call the scene temporary, custom, imagined, fake, alternate, or separate.
- Scene chat must not claim that it changed the original story.
- When no scene is active, use story events and normal chat history naturally.

LONG-TERM CONVERSATION SUMMARY

${
  longTermSummary ||
  "No separate long-term summary is available."
}

RELEVANT STORY EVENTS

${memoryToBullets(
  relevantStoryMemory
)}

PREVIOUS CONVERSATION

${historyToTranscript(
  relevantChatHistory,
  safeCharacter.name
)}

CURRENT RELATIONSHIP STATE

Trust:
${relationship.trust}/100

Friendship:
${relationship.friendship}/100

Romance:
${relationship.romance}/100

Suspicion:
${relationship.suspicion}/100

Relationship behaviour guidance:

${relationshipGuidance(
  relationship
)}

LATEST USER MESSAGE ANALYSIS

Likely intent:
${userIntent}

Likely emotional tone:
${userTone}

Pacing instruction:
${replyPacing}

LATEST USER MESSAGE

${toText(message)}

REALISTIC CONVERSATION RULES

1. Respond to the exact meaning of the latest message before adding anything else.

2. Never narrate, decide, or invent the user's actions, thoughts, feelings, body language, or dialogue.

3. You may include only one brief physical reaction, expression, pause, or gesture belonging to your character, and only when it adds meaning.

4. Sound natural rather than poetic, theatrical, melodramatic, or overly polished.

5. Use contractions, interruptions, hesitation, incomplete certainty, humour, defensiveness, warmth, or awkwardness when they fit the character.

6. Do not agree with everything. The character may disagree, misunderstand, refuse, set boundaries, become irritated, or ask for time when believable.

7. Do not force every exchange into romance or conflict. Ordinary warmth, teasing, silence, practical concern, and small talk can also feel intimate.

8. Do not repeat the user's message in different words before replying.

9. Do not repeatedly use phrases such as “I heard you,” “I’m still here,” “for a moment,” “meets your gaze,” or “lets out a breath.”

10. Do not always begin with the user's name.

11. Do not always end with a question. Ask a question only when the character genuinely needs an answer or wants to move the conversation forward.

12. Keep secrets consistent. Reveal one only when trust, pressure, prior clues, or the current scene genuinely earns it.

13. Refer to earlier messages naturally when relevant, but do not recite the entire history.

14. Keep facts consistent with the supplied story, scene, character profile, and previous conversation. Do not invent major past events without support.

15. Relationship values influence behaviour silently. Never mention scores or numbers.

16. Every reply should do at least one useful thing: answer, react, clarify, reveal emotion, deepen the relationship, create believable tension, establish a boundary, or move the conversation forward.

17. Output only the character's reply as plain text. Do not add labels, analysis, JSON, headings, or explanations.

CHARACTER REPLY
`;

  try {
    const aiText =
      await callGemini(
        prompt,
        {
          temperature: 0.88,
          maxOutputTokens: 480
        }
      );

    const reply =
      cleanGeneratedReply(
        aiText,
        safeCharacter.name
      );

    return (
      reply ||
      buildFallbackReply(
        safeCharacter,
        sceneActive,
        message,
        userIntent
      )
    );
  } catch (error) {
    console.error(
      "Character chat generation failed:",
      error
    );

    return buildFallbackReply(
      safeCharacter,
      sceneActive,
      message,
      userIntent
    );
  }
}

module.exports = {
  chatWithCharacter
};