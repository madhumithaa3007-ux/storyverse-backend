const { callGemini } = require("./geminiClient");

function clampNumber(value, minimum, maximum, fallback) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(
    minimum,
    Math.min(maximum, parsed)
  );
}

function cleanJsonText(value) {
  let result = String(value || "")
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

function text(value, fallback = "") {
  const result =
    String(value ?? "").trim();

  return result || fallback;
}

function shortText(
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

function stringArray(
  value,
  maximumItems,
  maximumLength
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(item => {
      return shortText(
        item,
        maximumLength
      );
    })
    .filter(Boolean)
    .slice(0, maximumItems);
}

function getStoryPhase(
  chapterNumber,
  chapterCount
) {
  if (chapterNumber === 1) {
    return "opening";
  }

  if (
    chapterNumber ===
    chapterCount
  ) {
    return "finale";
  }

  const progress =
    chapterNumber /
    chapterCount;

  if (progress <= 0.25) {
    return "rising";
  }

  if (progress <= 0.5) {
    return "midpoint";
  }

  if (progress <= 0.78) {
    return "escalation";
  }

  return "crisis";
}

function createFallbackChapter(
  storyData,
  chapterNumber,
  chapterCount
) {
  const phase =
    getStoryPhase(
      chapterNumber,
      chapterCount
    );

  const conflict =
    text(
      storyData.conflictType,
      "the main conflict"
    );

  const romance =
    text(
      storyData.romanceType,
      "the central relationship"
    );

  const setting =
    text(
      storyData.worldSetting,
      "the established story world"
    );

  const templates = {
    opening: {
      title:
        "The Moment Everything Changes",

      goal:
        "Establish the player's ordinary life, strongest emotional need, and the incident that forces the story to begin.",

      beats: [
        "Open inside an ordinary but emotionally revealing moment.",

        "Bring an important relationship into direct contact with the player.",

        "Interrupt normal life with the first sign of danger, opportunity, or unresolved history.",

        "Make the player's first meaningful choice alter how another character responds.",

        "Reveal that the initial problem is connected to something more personal."
      ],

      reveal:
        "The player learns that the triggering event is not accidental.",

      cliffhanger:
        "A new arrival, discovery, message, or threat makes returning to normal impossible."
    },

    rising: {
      title:
        "Pressure Under the Surface",

      goal:
        "Deepen the conflict while allowing choices to shape trust, suspicion, attraction, and alliances.",

      beats: [
        "Show a believable consequence from the previous chapter.",

        `Complicate ${romance} through closeness, misunderstanding, jealousy, restraint, or honesty.`,

        `Introduce a practical obstacle connected to ${conflict}.`,

        "Let a supporting character reveal an unexpected motive or vulnerability.",

        "Force the player to choose what or whom to prioritise."
      ],

      reveal:
        "A trusted explanation is proven incomplete or misleading.",

      cliffhanger:
        "A plan fails or a secret nearly reaches the wrong person."
    },

    midpoint: {
      title:
        "The Truth Changes Shape",

      goal:
        "Deliver a major turning point that changes the player's understanding, priorities, or relationships.",

      beats: [
        "Begin with the consequences of the player's strongest earlier decision.",

        "Bring two competing relationships or loyalties into conflict.",

        "Reveal a truth that reinterprets an earlier event.",

        "Give the player a chance to protect, confront, forgive, investigate, or withdraw.",

        "Make the cost of continuing emotionally and practically clear."
      ],

      reveal:
        `The real source or personal cost of ${conflict} becomes visible.`,

      cliffhanger:
        "A betrayal, confession, disappearance, or irreversible decision closes the old path."
    },

    escalation: {
      title:
        "What the Choices Cost",

      goal:
        "Make accumulated choices produce visible rewards, losses, tension, loyalty, and changed behaviour.",

      beats: [
        "Open with a relationship reacting to the player's history rather than only the latest action.",

        "Allow a quieter human moment before pressure returns.",

        "Turn one old clue, promise, or mistake into a present complication.",

        "Push an ally, rival, or love interest to make a choice of their own.",

        "Move the player closer to the source of the conflict while reducing safe options."
      ],

      reveal:
        "Someone important has been hiding a motive, sacrifice, or divided loyalty.",

      cliffhanger:
        "The player is exposed, separated, trapped, or forced into a dangerous alliance."
    },

    crisis: {
      title:
        "Everything at Risk",

      goal:
        "Bring the main secrets, relationships, and threats into direct collision before the finale.",

      beats: [
        "Show the immediate damage caused by the previous cliffhanger.",

        "Make the most important relationship demand honesty or commitment.",

        "Reveal the final missing clue needed to understand the conflict.",

        "Force a sacrifice, confrontation, or risky plan.",

        "Leave the player with one final unresolved danger or emotional decision."
      ],

      reveal:
        "The full truth is known, but acting on it will cost the player something important.",

      cliffhanger:
        "The antagonist, danger, or emotional conflict gains temporary control just before the final confrontation."
    },

    finale: {
      title:
        "The Choice That Remains",

      goal:
        "Resolve the central conflict and let accumulated choices shape the emotional and practical ending.",

      beats: [
        "Bring the player face to face with the central conflict.",

        "Pay off the most important clue, promise, wound, and relationship tension.",

        "Give major characters agency in the final confrontation.",

        "Let earlier choices alter who helps, trusts, leaves, forgives, or sacrifices.",

        "End with a clear consequence and an emotionally earned final image."
      ],

      reveal:
        "The final truth and the real cost of victory, love, justice, freedom, or forgiveness are revealed.",

      cliffhanger:
        "Conclude the story rather than creating another unresolved chapter."
    }
  };

  const source =
    templates[phase];

  return {
    chapter:
      chapterNumber,

    title:
      chapterNumber === 1 ||
      chapterNumber === chapterCount
        ? source.title
        : `Chapter ${chapterNumber}: ${source.title}`,

    goal:
      source.goal,

    setting:
      setting,

    continuityFromPrevious:
      chapterNumber === 1
        ? "The story begins here."
        : "Begin with the emotional and practical consequences of the previous chapter's ending.",

    routeBeats:
      source.beats,

    emotionalFocus:
      "Allow trust, suspicion, affection, rivalry, humour, fear, grief, and vulnerability to change naturally through player choices.",

    requiredReveal:
      source.reveal,

    choiceImpact:
      "Official milestone choices may change reactions, access to information, alliances, relationship warmth, risk, and the form of the consequence while preserving the chapter's main destination.",

    freeTextBoundary:
      "Free-text player messages may affect only immediate dialogue, mood, body language, and small scene reactions. They must never replace route beats, required reveals, chapter goals, ending states, cliffhangers, or the planned final resolution.",

    endingState:
      phase === "finale"
        ? "The main conflict is resolved and the ending reflects accumulated choices."
        : "The chapter goal is achieved or transformed, but the next problem is now unavoidable.",

    cliffhanger:
      source.cliffhanger
  };
}

function createFallbackChapterPlan(
  storyData,
  chapterCount
) {
  return Array.from(
    {
      length:
        chapterCount
    },
    (_, index) => {
      return createFallbackChapter(
        storyData,
        index + 1,
        chapterCount
      );
    }
  );
}

function normalizeChapterPlan(
  rawPlan,
  storyData,
  chapterCount
) {
  const raw =
    Array.isArray(rawPlan)
      ? rawPlan
      : [];

  const fallback =
    createFallbackChapterPlan(
      storyData,
      chapterCount
    );

  return Array.from(
    {
      length:
        chapterCount
    },
    (_, index) => {
      const chapterNumber =
        index + 1;

      const source =
        raw.find(item => {
          return (
            Number(
              item &&
              item.chapter
            ) ===
            chapterNumber
          );
        })
        ||
        raw[index]
        ||
        {};

      const backup =
        fallback[index];

      const routeBeats =
        stringArray(
          source.routeBeats ||
          source.keyEvents,
          5,
          220
        );

      return {
        chapter:
          chapterNumber,

        title:
          shortText(
            source.title,
            100,
            backup.title
          ),

        goal:
          shortText(
            source.goal,
            320,
            backup.goal
          ),

        setting:
          shortText(
            source.setting,
            220,
            backup.setting
          ),

        continuityFromPrevious:
          shortText(
            source.continuityFromPrevious,
            260,
            backup.continuityFromPrevious
          ),

        routeBeats:
          routeBeats.length === 5
            ? routeBeats
            : backup.routeBeats,

        /*
        Keep keyEvents for compatibility
        with older Chapter Play code.
        */
        keyEvents:
          routeBeats.length > 0
            ? routeBeats
            : backup.routeBeats,

        emotionalFocus:
          shortText(
            source.emotionalFocus,
            280,
            backup.emotionalFocus
          ),

        requiredReveal:
          shortText(
            source.requiredReveal,
            280,
            backup.requiredReveal
          ),

        choiceImpact:
          shortText(
            source.choiceImpact,
            300,
            backup.choiceImpact
          ),

        freeTextBoundary:
          shortText(
            source.freeTextBoundary,
            360,
            backup.freeTextBoundary
          ),

        endingState:
          shortText(
            source.endingState,
            260,
            backup.endingState
          ),

        cliffhanger:
          shortText(
            source.cliffhanger,
            280,
            backup.cliffhanger
          )
      };
    }
  );
}

function extractStoryPreview(
  rawResponse,
  fallback
) {
  const raw =
    String(
      rawResponse || ""
    ).trim();

  if (!raw) {
    return fallback;
  }

  try {
    const parsed =
      JSON.parse(
        cleanJsonText(raw)
      );

    return text(
      parsed.storyPreview ||
      parsed.story,
      fallback
    );
  }
  catch (error) {
    const match =
      raw.match(
        /"storyPreview"\s*:\s*"([\s\S]*?)"\s*,\s*"chapterPlan"/
      );

    if (
      match &&
      match[1]
    ) {
      return match[1]
        .replace(
          /\\n/g,
          "\n"
        )
        .replace(
          /\\"/g,
          '"'
        )
        .trim();
    }

    return fallback;
  }
}

async function generateStory(
  storyData
) {
  const data =
    storyData || {};

  const title =
    text(
      data.title,
      "Untitled Story"
    );

  const genre =
    text(
      data.genre,
      "Drama"
    );

  const mood =
    text(
      data.mood,
      "Emotional"
    );

  const theme =
    text(
      data.theme,
      "Secrets and Choices"
    );

  const worldSetting =
    text(
      data.worldSetting,
      "Modern City"
    );

  const romanceType =
    text(
      data.romanceType,
      "Slow Burn"
    );

  const conflictType =
    text(
      data.conflictType,
      "Hidden Secret"
    );

  const chapterCount =
    clampNumber(
      data.storyLength,
      1,
      30,
      20
    );

  const endingCount =
    clampNumber(
      data.endingCount,
      1,
      8,
      3
    );

  const idea =
    text(
      data.idea,
      "A character is pulled into a life-changing conflict where relationships and choices shape what happens next."
    );

  const prompt = `
You are StoryVerse AI, planning a premium interactive drama.

Return ONLY valid JSON.
Do not include markdown, comments, explanations, or text outside the JSON object.

STORY INPUTS

Title: ${title}
Genre: ${genre}
Mood: ${mood}
Theme: ${theme}
World Setting: ${worldSetting}
Romance Type: ${romanceType}
Conflict Type: ${conflictType}
Chapter Count: ${chapterCount}
Possible Ending Count: ${endingCount}
Story Idea: ${idea}

Characters are generated separately. Do not create character profiles or suggestedCharacters.

OUTPUT FORMAT

{
  "storyPreview":"A complete preview",
  "chapterPlan":[
    {
      "chapter":1,
      "title":"Specific chapter title",
      "goal":"What must meaningfully change in this chapter",
      "setting":"Primary location and atmosphere",
      "continuityFromPrevious":"How the previous chapter's consequence opens this chapter",
      "routeBeats":[
        "Beat 1",
        "Beat 2",
        "Beat 3",
        "Beat 4",
        "Beat 5"
      ],
      "emotionalFocus":"Main relationship or emotional tension",
      "requiredReveal":"Truth, clue, danger, or emotional shift that must occur",
      "choiceImpact":"What official choices may change without breaking the base route",
      "freeTextBoundary":"What free-text player messages are not allowed to change",
      "endingState":"What is different by the end of the chapter",
      "cliffhanger":"Strong final beat"
    }
  ]
}

STORY PREVIEW RULES

- Write 6 to 8 complete sentences and approximately 140 to 210 words.
- Explain the setup, player's emotional need, central conflict, key relationship pressure, setting, and story promise.
- Make it sound like an exciting story preview, not a chapter scene and not a list.
- Do not reveal the full ending.
- End with a complete hook rather than an abrupt sentence.

REALISTIC STORY ROUTE RULES

- Create exactly ${chapterCount} connected chapter objects.
- The route must feel like one planned story, not unrelated episodes.
- Every chapter must begin from the previous chapter's emotional and practical consequences.
- Give every chapter exactly 5 short routeBeats.
- Route beats must include a balance of action, conversation, discovery, relationship movement, and consequence.
- Characters must have agency. Supporting characters should make choices, hide things, misunderstand, apologise, refuse, help, betray, or change their minds for believable reasons.
- Do not create a major twist in every chapter. Alternate quieter human moments with conflict, mystery, humour, intimacy, danger, and loss.
- Only official milestone choices may create lasting branch effects such as changed trust, access, information, alliances, romance, suspicion, risk, and later callbacks.
- Free-text player messages are roleplay input only. They may change immediate wording, tone, body language, or a brief local reaction, but they must not rewrite story facts, skip route beats, change the required reveal, replace the chapter goal, alter the ending state, or create a different cliffhanger.
- If a free-text message contradicts the planned route, the story world must respond naturally and steer the scene back toward the current route beat without sounding robotic.
- Preserve a coherent base story even when official choices alter branch details.
- Avoid repetitive chapter goals such as another warning, another mysterious message, or another argument without new information.
- Escalate gradually. Early chapters establish needs and relationships; middle chapters reinterpret the conflict; late chapters make earlier choices costly; the final chapter resolves the central conflict.
- Each requiredReveal must add new information or a real emotional shift.
- Each endingState must describe what has actually changed.
- Each cliffhanger must grow from the chapter rather than appearing randomly.
- The final chapter must resolve the story and support ${endingCount} possible emotional outcomes shaped by accumulated choices.
- Keep all fields concise so the JSON remains complete.

Return valid JSON only.
`;

  let aiText = "";

  try {
    aiText =
      await callGemini(
        prompt,
        {
          temperature:
            0.68,

          responseMimeType:
            "application/json",

          maxOutputTokens:
            7000
        }
      );

    const parsed =
      JSON.parse(
        cleanJsonText(aiText)
      );

    return {
      storyPreview:
        text(
          parsed.storyPreview ||
          parsed.story,
          idea
        ),

      /*
      Characters are generated separately.
      Keep this empty property so the
      current server/frontend will not break.
      */
      suggestedCharacters:
        [],

      chapterPlan:
        normalizeChapterPlan(
          parsed.chapterPlan,
          data,
          chapterCount
        )
    };
  }
  catch (error) {
    console.error(
      "Interactive story generation failed:",
      error
    );

    if (aiText) {
      console.error(
        "Raw story response:",
        aiText
      );
    }

    return {
      storyPreview:
        extractStoryPreview(
          aiText,
          idea
        ),

      suggestedCharacters:
        [],

      chapterPlan:
        createFallbackChapterPlan(
          data,
          chapterCount
        )
    };
  }
}

module.exports = {
  generateStory
};