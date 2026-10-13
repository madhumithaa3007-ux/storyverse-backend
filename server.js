const express = require("express");
const cors = require("cors");

const { generateStory } = require("./storyEngine");
const { generateCharacter } = require("./characterEngine");
const {
generateStoryCharacters
} = require(
"./characterSuggestionEngine"
);
const { chatWithCharacter } = require("./chatEngine");
const { chatWithStandaloneCharacter } = require("./standaloneChatEngine");
const { playChapter } = require("./chapterEngine");
const {
saveStory
} = require(
"./storyRepository"
);

const app = express();

app.use(cors());
app.use(express.json({
limit:"10mb"
}));

app.get("/", (req, res) => {

    res.send("🚀 StoryVerse AI Backend Running");

});

app.get("/health", (req,res)=>{

res.json({

success:true,

message:"StoryVerse AI Backend Running"

});

});

app.post("/generate-story", async (req, res) => {
  try {
    const body = req.body || {};
    const {
      title, genre, mood, theme, worldSetting, romanceType,
      conflictType, storyLength, characterCount, endingCount, idea
    } = body;

    console.log("================================");
    console.log("Story Generation Request");
    console.log("Title:", title || "Untitled Story");
    console.log("Genre:", genre || "Drama");
    console.log("================================");

    const generatedStory = await generateStory({
      title, genre, mood, theme, worldSetting, romanceType,
      conflictType, storyLength, characterCount, endingCount, idea
    });

    const story = generatedStory.storyPreview || generatedStory.story || "";
    const chapterPlan = Array.isArray(generatedStory.chapterPlan)
      ? generatedStory.chapterPlan
      : [];

    // Older frontend pages expect suggestedCharacters from /generate-story.
    // The story engine intentionally focuses on the story route, so generate
    // the cast as a separate, smaller request and keep the response contract.
    let suggestedCharacters = Array.isArray(generatedStory.suggestedCharacters)
      ? generatedStory.suggestedCharacters
      : [];
    let characterGenerationWarning = null;

    if (suggestedCharacters.length === 0) {
      try {
        const characterResult = await generateStoryCharacters({
          story: {
            title, genre, mood, theme, worldSetting, romanceType,
            conflictType, storyLength, characterCount,
            description: idea, idea, story
          },
          characterCount,
          existingCharacters: []
        });
        suggestedCharacters = Array.isArray(characterResult.characters)
          ? characterResult.characters
          : [];
        if (suggestedCharacters.length === 0) {
          characterGenerationWarning = characterResult.message ||
            "The story was created, but no characters were generated. Use Generate Characters to try again.";
        }
      } catch (characterError) {
        console.error("Initial story cast generation failed:", characterError.message || characterError);
        characterGenerationWarning =
          "The story was created, but the cast could not be generated. Please use Generate Characters to retry.";
      }
    }

    let storyId = null;
    try {
      const savedStory = await saveStory({
        title, genre, mood, theme, worldSetting, romanceType,
        conflictType, storyLength, characterCount, endingCount, idea,
        story, chapterPlan, suggestedCharacters
      });
      storyId = savedStory && savedStory.id ? savedStory.id : null;
    } catch (saveError) {
      console.error("Story Save Error:", saveError.message || saveError);
    }

    res.json({
      success: true,
      story,
      // Keep both names for old and newer frontend clients.
      suggestedCharacters,
      characters: suggestedCharacters,
      chapterPlan,
      storyId,
      characterGenerationWarning
    });
  } catch (error) {
    console.error("Story Generation Error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Unable to generate story."
    });
  }
});

app.post("/generate-character", async (req,res)=>{

    try{

        const character =
        await generateCharacter(req.body);

        res.json({

            success:true,

            character

        });

    }

    catch(error){

        console.error(error);

        res.status(500).json({

            success:false,

            error:error.message

        });

    }

});

app.post(
"/generate-story-characters",
async (req,res)=>{

try{

const result =
await generateStoryCharacters(
req.body
);

res.json({

success:true,

characters:
result.characters || [],

requestedTotal:
result.requestedTotal,

generatedCount:
result.generatedCount || 0,

message:
result.message || ""

});

}
catch(error){

console.error(
"Story Character Generation Error:"
);

console.error(error);

res.status(500).json({

success:false,

error:
error.message ||
"Unable to generate story characters."

});

}

}
);

app.post(
"/play-chapter",
async (req,res)=>{

try{

const result =
await playChapter(
req.body
);

res.json({

success:true,

result

});

}

catch(error){

console.error(error);

res.status(500).json({

success:false,

error:error.message

});

}

});

app.post("/chat-character", async (req,res)=>{

try{

const reply =
await chatWithCharacter(
req.body
);

    res.json({

        success:true,

        reply

    });

}

catch(error){

    console.error(error);

    res.status(500).json({

        success:false,

        error:error.message

    });

}

});


app.post("/chat-standalone-character", async (req, res) => {
  try {
    const reply = await chatWithStandaloneCharacter(req.body || {});
    res.json({ success: true, reply });
  } catch (error) {
    console.error("Standalone Character Chat Error:", error);
    res.status(500).json({ success: false, error: error.message || "Unable to chat with this character." });
  }
});

const PORT =
process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log("================================");
    console.log("🚀 StoryVerse AI Server Started");
    console.log("🌐 Server running on port " + PORT);
    console.log("================================");

});