const supabase =
require("./supabase");

async function saveStory(storyData){

const { data, error } =
await supabase
.from("stories")
.insert([
{
title:
storyData.title,

genre:
storyData.genre,

summary:
storyData.story
?
storyData.story.substring(0,500)
:
"",

story_data:{
mood:
storyData.mood,

theme:
storyData.theme,

worldSetting:
storyData.worldSetting,

romanceType:
storyData.romanceType,

conflictType:
storyData.conflictType,

storyLength:
storyData.storyLength,

characterCount: 
storyData.characterCount,

endingCount:
storyData.endingCount,

idea:
storyData.idea,

fullStory:
storyData.story,

chapterPlan:
storyData.chapterPlan || [],

suggestedCharacters:
storyData.suggestedCharacters || []
},

chapter_limit:
parseInt(storyData.storyLength) || 20,

current_chapter:
1,

status:
"active",

created_at:
new Date().toISOString()
}
])
.select()
.single();

if(error){

throw error;

}

return data;

}

module.exports = {
saveStory
};