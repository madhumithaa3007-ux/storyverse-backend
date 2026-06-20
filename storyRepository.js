const supabase =
require("./supabase");

async function saveStory(storyData){

const { data, error } =
await supabase
.from("stories")
.insert([
{
title: storyData.title,
genre: storyData.genre,

summary:
storyData.story.substring(0,500),

story_data:{
mood: storyData.mood,
theme: storyData.theme,
worldSetting: storyData.worldSetting,
romanceType: storyData.romanceType,
conflictType: storyData.conflictType,
storyLength: storyData.storyLength,
endingCount: storyData.endingCount,
idea: storyData.idea,
fullStory: storyData.story
},

chapter_limit:
parseInt(storyData.storyLength) || 20,

current_chapter:1,

status:"active"
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