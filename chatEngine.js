const { callGemini } = require("./geminiClient");

function number(
  value,
  fallback = 0
) {
  const parsed =
    Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function text(
  value,
  fallback = ""
) {
  const result =
    String(value ?? "").trim();

  return result || fallback;
}

function shorten(
  value,
  maximum = 260,
  fallback = ""
) {
  const result =
    text(value, fallback);

  if (result.length <= maximum) {
    return result;
  }

  return (
    result
      .slice(0, maximum)
      .trimEnd() +
    "…"
  );
}

function cleanJsonText(value) {
  let result =
    String(value || "")
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

  const firstBrace =
    result.indexOf("{");

  const lastBrace =
    result.lastIndexOf("}");

  if (
    firstBrace !== -1 &&
    lastBrace > firstBrace
  ) {
    result =
      result.slice(
        firstBrace,
        lastBrace + 1
      );
  }

  return result;
}

function normalizeRelationship(value) {
  const source =
    value &&
    typeof value === "object"
      ? value
      : {};

  const score = (
    item,
    fallback
  ) => {
    return Math.max(
      0,
      Math.min(
        100,
        number(item, fallback)
      )
    );
  };

  return {
    trust:
      score(
        source.trust,
        50
      ),

    friendship:
      score(
        source.friendship,
        50
      ),

    romance:
      score(
        source.romance,
        0
      ),

    suspicion:
      score(
        source.suspicion,
        0
      )
  };
}

function compactCharacter(character) {
  const source =
    character || {};

  return {
    name:
      text(source.name),

    role:
      text(source.role),

    occupation:
      text(source.occupation),

    traits:
      shorten(
        source.traits,
        150
      ),

    speechStyle:
      text(
        source.speechStyle
      ),

    relationshipStyle:
      text(
        source.relationshipStyle
      ),

    strengths:
      shorten(
        source.strengths,
        120
      ),

    weaknesses:
      shorten(
        source.weaknesses,
        120
      ),

    fears:
      shorten(
        source.fears,
        110
      ),

    secretType:
      text(
        source.secretType
      ),

    profile:
      shorten(
        source.profile,
        360
      ),

    relationship:
      normalizeRelationship(
        source.relationship
      )
  };
}

function compactMemoryEntry(entry) {
  if (
    typeof entry ===
    "string"
  ) {
    return {
      type:
        "context",

      text:
        shorten(
          entry,
          260
        )
    };
  }

  if (
    !entry ||
    typeof entry !== "object"
  ) {
    return null;
  }

  const result = {
    type:
      text(
        entry.type ||
        entry.mode ||
        "context"
      ),

    chapter:
      entry.chapter ?? "",

    speaker:
      shorten(
        entry.speaker ||
        entry.character ||
        entry.characterName,
        60
      ),

    text:
      shorten(
        entry.text ||
        entry.message ||
        entry.narration ||
        entry.choice ||
        entry.action ||
        entry.summary,
        280
      )
  };

  if (!result.text) {
    return null;
  }

  return result;
}

function memoryWindow(
  entries,
  recentLimit = 24,
  olderSamples = 6
) {
  const source =
    Array.isArray(entries)
      ? entries
      : [];

  const recent =
    source.slice(
      -recentLimit
    );

  const older =
    source.slice(
      0,
      Math.max(
        0,
        source.length -
        recentLimit
      )
    );

  const sampled = [];

  if (older.length > 0) {
    const count =
      Math.min(
        olderSamples,
        older.length
      );

    for (
      let index = 0;
      index < count;
      index++
    ) {
      const sourceIndex =
        Math.floor(
          (
            index *
            (
              older.length - 1
            )
          ) /
          Math.max(
            1,
            count - 1
          )
        );

      sampled.push(
        older[sourceIndex]
      );
    }
  }

  return [
    ...sampled,
    ...recent
  ]
    .map(
      compactMemoryEntry
    )
    .filter(Boolean);
}

function routeBeats(plan) {
  const source =
    Array.isArray(
      plan.routeBeats
    )
      ? plan.routeBeats
      : Array.isArray(
          plan.keyEvents
        )
        ? plan.keyEvents
        : [];

  return source
    .map(item => {
      return text(item);
    })
    .filter(Boolean)
    .slice(0, 5);
}

function getBeat(
  plan,
  interactionCount
) {
  const beats =
    routeBeats(plan);

  if (beats.length === 0) {
    return {
      index:
        0,

      current:
        text(
          plan.goal,
          "Move the chapter toward a meaningful consequence."
        ),

      next:
        text(
          plan.requiredReveal ||
          plan.cliffhanger,
          "Change the situation in a believable way."
        )
    };
  }

  /*
  Each route beat roughly controls
  ten interactions.
  */
  const ranges = [
    0,
    10,
    20,
    30,
    40
  ];

  let index =
    ranges.reduce(
      (
        result,
        start,
        currentIndex
      ) => {
        return (
          interactionCount >= start
            ? currentIndex
            : result
        );
      },
      0
    );

  index =
    Math.min(
      index,
      beats.length - 1
    );

  return {
    index:
      index,

    current:
      beats[index],

    next:
      beats[
        Math.min(
          index + 1,
          beats.length - 1
        )
      ]
  };
}

function getMode(
  interactionCount,
  milestones
) {
  if (
    interactionCount >= 50
  ) {
    return "chapter_finale";
  }

  if (
    interactionCount >= 46
  ) {
    return "cliffhanger_build";
  }

  if (
    milestones.includes(
      interactionCount
    )
  ) {
    return "milestone_choice";
  }

  return "normal";
}

function realisticChoiceFallbacks() {
  return [
    {
      type:
        "emotional",

      text:
        "Say what this moment is truly making you feel."
    },

    {
      type:
        "relationship",

      text:
        "Turn to the person whose trust matters most right now."
    },

    {
      type:
        "mystery",

      text:
        "Focus on the detail that does not fit the explanation."
    },

    {
      type:
        "risky",

      text:
        "Act before anyone else can stop or prepare for it."
    }
  ];
}

function normalizeChoices(value) {
  const source =
    Array.isArray(value)
      ? value
      : [];

  const fallback =
    realisticChoiceFallbacks();

  const types = [
    "emotional",
    "relationship",
    "mystery",
    "risky"
  ];

  return types.map(
    (
      type,
      index
    ) => {
      const matchingChoice =
        source.find(choice => {
          return (
            text(
              choice &&
              choice.type
            ).toLowerCase() ===
            type
          );
        });

      return {
        type:
          type,

        text:
          shorten(
            matchingChoice &&
            matchingChoice.text,
            155,
            fallback[index].text
          )
      };
    }
  );
}

function normalizeMessages(
  value,
  playerName,
  allowedNames
) {
  const source =
    Array.isArray(value)
      ? value
      : [];

  const allowed =
    new Set(
      allowedNames.map(name => {
        return text(
          name
        ).toLowerCase();
      })
    );

  const player =
    text(
      playerName
    ).toLowerCase();

  return source
    .filter(message => {
      const name =
        text(
          message &&
          message.character
        ).toLowerCase();

      return (
        name &&
        name !== player &&
        allowed.has(name) &&
        text(
          message &&
          message.text
        )
      );
    })
    .slice(0, 3)
    .map(message => {
      return {
        character:
          text(
            message.character
          ),

        text:
          shorten(
            message.text,
            420
          )
      };
    });
}

function normalizeRelationshipChanges(
  value
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(item => {
      return (
        item &&
        typeof item ===
        "object"
      );
    })
    .slice(0, 8)
    .map(item => {
      return {
        character:
          shorten(
            item.character ||
            item.name,
            70
          ),

        trust:
          Math.max(
            -10,
            Math.min(
              10,
              number(
                item.trust,
                0
              )
            )
          ),

        friendship:
          Math.max(
            -10,
            Math.min(
              10,
              number(
                item.friendship,
                0
              )
            )
          ),

        romance:
          Math.max(
            -10,
            Math.min(
              10,
              number(
                item.romance,
                0
              )
            )
          ),

        suspicion:
          Math.max(
            -10,
            Math.min(
              10,
              number(
                item.suspicion,
                0
              )
            )
          ),

        reason:
          shorten(
            item.reason,
            180
          )
      };
    });
}

function normalizeSummary(
  summary,
  chapterNumber,
  plan,
  latestAction
) {
  const source =
    summary &&
    typeof summary ===
    "object"
      ? summary
      : {};

  const list = (
    value,
    maximum,
    length
  ) => {
    return Array.isArray(value)
      ? value
          .map(item => {
            return shorten(
              item,
              length
            );
          })
          .filter(Boolean)
          .slice(
            0,
            maximum
          )
      : [];
  };

  const generatedChoices =
    list(
      source.importantChoices,
      8,
      220
    );

  return {
    chapterTitle:
      shorten(
        source.chapterTitle,
        120,
        text(
          plan.title,
          `Chapter ${chapterNumber}`
        )
      ),

    keyEvents:
      list(
        source.keyEvents,
        8,
        240
      ),

    importantChoices:
      generatedChoices.length > 0
        ? generatedChoices
        : latestAction
          ? [
              shorten(
                latestAction,
                220
              )
            ]
          : [],

    relationshipChanges:
      normalizeRelationshipChanges(
        source.relationshipChanges
      ),

    characterDevelopments:
      list(
        source.characterDevelopments,
        8,
        220
      ),

    currentMysteries:
      list(
        source.currentMysteries,
        8,
        220
      ),

    cliffhangerDescription:
      shorten(
        source.cliffhangerDescription,
        280,
        text(
          plan.cliffhanger
        )
      )
  };
}

function fallbackResponse(
  mode,
  context
) {
  const {
    chapterNumber,
    finalChapter,
    currentBeat,
    nextBeat,
    cliffhanger,
    chapterTitle,
    action,
    firstNpc
  } = context;

  if (
    mode ===
    "chapter_finale"
  ) {
    const finalLine =
      finalChapter
        ? "The End."
        : `To be continued in Chapter ${chapterNumber + 1}…`;

    return {
      mode:
        mode,

      narration:
        `The consequences of the last decision settle over the scene. ${shorten(
          cliffhanger ||
          nextBeat ||
          currentBeat,
          340,
          "A truth comes to light, changing what everyone must do next."
        )}\n\n${finalLine}`,

      messages:
        [],

      choices:
        [],

      chapterComplete:
        true,

      summary: {
        chapterTitle:
          chapterTitle ||
          `Chapter ${chapterNumber}`,

        keyEvents: [
          currentBeat ||
          "The chapter reached a turning point."
        ],

        importantChoices:
          action
            ? [
                shorten(
                  action,
                  220
                )
              ]
            : [],

        relationshipChanges:
          [],

        characterDevelopments:
          [],

        currentMysteries:
          cliffhanger
            ? [
                cliffhanger
              ]
            : [],

        cliffhangerDescription:
          cliffhanger ||
          nextBeat ||
          "The next conflict is now unavoidable."
      },

      isFallback:
        true
    };
  }

  const narration =
    mode ===
    "cliffhanger_build"
      ? `The scene tightens around a detail that can no longer be ignored. ${shorten(
          nextBeat ||
          cliffhanger,
          300,
          "Someone nearby realises the situation is about to change."
        )}`
      : `The latest decision changes the mood and the options available. ${shorten(
          currentBeat,
          300,
          "Another character reacts in a way that makes the consequence clear."
        )}`;

  return {
    mode:
      mode,

    narration:
      narration,

    messages:
      firstNpc
        ? [
            {
              character:
                firstNpc,

              text:
                mode ===
                "milestone_choice"
                  ? "We need to decide what matters before someone else decides for us."
                  : "That changes things. We cannot act as though nothing happened."
            }
          ]
        : [],

    choices:
      mode ===
      "milestone_choice"
        ? realisticChoiceFallbacks()
        : [],

    chapterComplete:
      false,

    summary:
      null,

    isFallback:
      true
  };
}

async function playChapter(payload) {
  const data =
    payload || {};

  const story =
    data.story &&
    typeof data.story ===
    "object"
      ? data.story
      : {};

  const characters =
    Array.isArray(
      data.characters
    )
      ? data.characters
      : [];

  const player =
    data.playerCharacter ||
    {};

  const chapterNumber =
    Math.max(
      1,
      number(
        data.currentChapter,
        1
      )
    );

  const chapterLimit =
    Math.max(
      1,
      number(
        data.chapterLimit,
        20
      )
    );

  const interactionCount =
    Math.max(
      0,
      number(
        data.chapterInteractionCount,
        0
      )
    );

  const finalChapter =
    chapterNumber >=
    chapterLimit;

  const milestones =
    Array.isArray(
      data.chapterMilestones
    )
      ? data.chapterMilestones
          .map(Number)
          .filter(
            Number.isFinite
          )
      : [
          5,
          15,
          25,
          35,
          45
        ];

  const chapterPlan =
    data.currentChapterPlan
    ||
    (
      Array.isArray(
        data.chapterPlan
      )
        ? data.chapterPlan.find(
            item => {
              return (
                Number(
                  item &&
                  item.chapter
                ) ===
                chapterNumber
              );
            }
          )
        : null
    )
    ||
    {};

  const mode =
    getMode(
      interactionCount,
      milestones
    );

  const beat =
    getBeat(
      chapterPlan,
      interactionCount
    );

  const storyMemory =
    memoryWindow(
      data.storyMemory,
      26,
      7
    );

  const importantChoices =
    memoryWindow(
      data.importantChoices,
      14,
      4
    );

  const npcs =
    characters
      .filter(character => {
        return (
          character &&
          text(
            character.name
          ).toLowerCase()
          !==
          text(
            player.name
          ).toLowerCase()
        );
      })
      .map(
        compactCharacter
      );

  const npcNames =
    npcs
      .map(character => {
        return character.name;
      })
      .filter(Boolean);

  const firstNpc =
    npcNames[0] || "";

  const finalLineRule =
    finalChapter
      ? "The exact final line must be: The End."
      : `The exact final line must be: To be continued in Chapter ${chapterNumber + 1}…`;

  const prompt = `
You are StoryVerse AI, continuing a realistic premium interactive story.

Return ONLY valid JSON. Do not include markdown or explanations.

STORY FOUNDATION

Title: ${text(
  story.title,
  "Untitled Story"
)}

Genre: ${text(
  story.genre,
  "Drama"
)}

Story preview: ${shorten(
  story.story ||
  story.summary ||
  story.description ||
  story.fullStory,
  1300
)}

CHAPTER STATE

Chapter: ${chapterNumber} of ${chapterLimit}
Interaction: ${interactionCount} of 50
Mode: ${mode}

Chapter title:
${text(
  chapterPlan.title,
  `Chapter ${chapterNumber}`
)}

Chapter goal:
${text(
  chapterPlan.goal,
  "Move the story toward a meaningful turning point."
)}

Setting:
${text(
  chapterPlan.setting
)}

Continuity from previous chapter:
${text(
  chapterPlan.continuityFromPrevious
)}

Emotional focus:
${text(
  chapterPlan.emotionalFocus
)}

Required reveal:
${text(
  chapterPlan.requiredReveal
)}

Choice impact guidance:
${text(
  chapterPlan.choiceImpact
)}

Required ending state:
${text(
  chapterPlan.endingState
)}

Planned cliffhanger:
${text(
  chapterPlan.cliffhanger
)}

CURRENT ROUTE BEAT

${beat.current}

NEXT ROUTE BEAT

${beat.next}

PLAYER PERSONA

${JSON.stringify(
  compactCharacter(
    player
  )
)}

NON-PLAYER CHARACTERS

${JSON.stringify(
  npcs
)}

RECENT AND LONG-TERM STORY MEMORY

${JSON.stringify(
  storyMemory
)}

IMPORTANT EARLIER CHOICES

${JSON.stringify(
  importantChoices
)}

PLAYER'S LATEST INPUT

${text(
  data.action,
  "Continue naturally from the current scene."
)}

OUTPUT FORMAT

{
  "mode":"${mode}",
  "narration":"Short scene narration",
  "messages":[
    {
      "character":"Exact non-player character name",
      "text":"Natural dialogue"
    }
  ],
  "choices":[],
  "chapterComplete":false,
  "summary":null
}

PLAYER AGENCY RULES

- The real user controls ${text(
  player.name,
  "the player character"
)}.

- Never invent the player's spoken dialogue, private thoughts, feelings, decisions, or voluntary actions.

- You may describe only immediate visible consequences affecting the player.

- Treat the latest input as intent. Do not rewrite it as a larger action than the user chose.

REALISTIC INTERACTION RULES

- Respond directly to the latest input before advancing the route.

- Every response must change something visible: another character's behaviour, access to information, risk, trust, suspicion, closeness, atmosphere, position, or available options.

- Small actions may create small believable consequences. Do not turn every sentence into a crisis.

- Let non-player characters have agency. They may disagree, hesitate, refuse, lie, joke, leave, help, apologise, misunderstand, protect themselves, or make plans of their own.

- Use relationship scores silently. High trust allows honesty; low trust creates caution; high suspicion creates testing or distance; romance may create warmth, restraint, jealousy, or vulnerability.

- Dialogue must match each character's speech style and emotional state.

- Use one or two concrete sensory or physical details when helpful, not in every sentence.

- Include natural pauses, interrupted speech, glances, movement, practical concerns, and imperfect reactions.

- Refer to previous choices only when relevant. Do not recite memory.

- Do not repeat the same warning, clue, argument, entrance, weather description, or emotional reaction.

- Do not introduce random twists that are unrelated to the chapter route.

- Alternate tension with quieter moments, humour, warmth, awkwardness, investigation, and reflection.

- Do not always end on a question or dramatic statement.

- Never use phrases about being an AI, prompt, system, or game engine.

MODE RULES

NORMAL:

- Write 45 to 90 words of narration, normally 2 to 4 sentences.

- Include 1 to 3 dialogue messages when characters are present and dialogue adds value.

- Dialogue should sound conversational, not like speeches.

- choices must be [].

- chapterComplete must be false.

MILESTONE_CHOICE:

- Write 35 to 70 words of narration that makes the decision meaningful.

- Include exactly four choices with types emotional, relationship, mystery, and risky.

- Each choice must be a concrete action or response that fits the exact scene.

- Choices must produce visibly different emotional or practical consequences.

- Stop after presenting the choices.

- chapterComplete must be false.

CLIFFHANGER_BUILD:

- Write 70 to 120 words.

- Bring together the route beat, required reveal, and accumulated consequences.

- Increase pressure without completing the chapter.

- choices must be [].

- chapterComplete must be false.

CHAPTER_FINALE:

- Write 110 to 190 words.

- Pay off the chapter goal, required reveal, and important choices.

- The cliffhanger must feel earned and must grow from what happened.

- choices must be [].

- chapterComplete must be true.

- summary must include chapterTitle, keyEvents, importantChoices, relationshipChanges, characterDevelopments, currentMysteries, and cliffhangerDescription.

- relationshipChanges must be objects with character, trust, friendship, romance, suspicion, and reason. Use changes from -10 to 10, not final scores.

- ${finalLineRule}

Return valid JSON only.
`;

  let aiText = "";

  try {
    aiText =
      await callGemini(
        prompt,
        {
          temperature:
            mode === "normal"
              ? 0.84
              : 0.78,

          responseMimeType:
            "application/json",

          maxOutputTokens:
            mode ===
            "chapter_finale"
              ? 1200
              : mode ===
                "milestone_choice"
                ? 800
                : mode ===
                  "cliffhanger_build"
                  ? 800
                  : 650
        }
      );

    const parsed =
      JSON.parse(
        cleanJsonText(
          aiText
        )
      );

    const complete =
      mode ===
      "chapter_finale"
      ||
      parsed.chapterComplete ===
      true;

    return {
      mode:
        mode,

      narration:
        shorten(
          parsed.narration,
          mode ===
          "chapter_finale"
            ? 1800
            : 1050,
          "The scene changes in response to the player's decision."
        ),

      messages:
        normalizeMessages(
          parsed.messages,
          player.name,
          npcNames
        ),

      choices:
        mode ===
        "milestone_choice"
          ? normalizeChoices(
              parsed.choices
            )
          : [],

      chapterComplete:
        complete,

      summary:
        complete
          ? normalizeSummary(
              parsed.summary,
              chapterNumber,
              chapterPlan,
              data.action
            )
          : null,

      isFallback:
        false
    };
  }
  catch (error) {
    console.error(
      "Interactive chapter generation failed:",
      error
    );

    if (aiText) {
      console.error(
        "Raw chapter response:",
        aiText
      );
    }

    return fallbackResponse(
      mode,
      {
        chapterNumber:
          chapterNumber,

        finalChapter:
          finalChapter,

        currentBeat:
          beat.current,

        nextBeat:
          beat.next,

        cliffhanger:
          text(
            chapterPlan.cliffhanger
          ),

        chapterTitle:
          text(
            chapterPlan.title,
            `Chapter ${chapterNumber}`
          ),

        action:
          text(
            data.action
          ),

        firstNpc:
          firstNpc
      }
    );
  }
}

module.exports = {
  playChapter
};