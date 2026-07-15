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

       const {
title,
genre,
mood,
theme,
worldSetting,
romanceType,
conflictType,
storyLength,
characterCount,
endingCount,
idea
} = req.body;

        console.log("================================");
        console.log("Story Generation Request");
        console.log("Title:", title);
        console.log("Genre:", genre);
        console.log("Idea:", idea);
        console.log("================================");
console.log(req.body);
const generatedStory =
await generateStory({
title,
genre,
mood,
theme,
worldSetting,
romanceType,
conflictType,
storyLength,
characterCount,
endingCount,
idea
});

const story =
generatedStory.storyPreview;

const suggestedCharacters =
generatedStory.suggestedCharacters || [];

const chapterPlan =
generatedStory.chapterPlan || [];
   let storyId =
null;

try{

const savedStory =
await saveStory({

title,
genre,
mood,
theme,
worldSetting,
romanceType,
conflictType,
storyLength,
characterCount,
endingCount,
idea,
story,
chapterPlan,
suggestedCharacters

});

storyId =
savedStory.id;

}

catch(saveError){

console.error(
"Story Save Error:"
);

console.error(
saveError
);

}

res.json({

success:true,

story,

suggestedCharacters,

chapterPlan,

storyId

});

    } catch (error) {

        console.error("Story Generation Error:");
        console.error(error);

        res.status(500).json({
            success: false,
            error: error.message
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


const PORT =
process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log("================================");
    console.log("🚀 StoryVerse AI Server Started");
    console.log("🌐 Server running on port " + PORT);
    console.log("================================");

});