const validateStoryTitle = (story) => {
  const obj = {};
  if (!story.title || story.title.trim === '') {
    obj.story_title_invalid = 'Please enter a valid story title.';
  } else if (story.title.length > 100) {
    obj.story_title_invalid = 'Your story title can only be up to 100 characters long!';
  }
  return obj;
};

const validateStory = (story) => ({
  ...story,
  ...validateStoryTitle(story),
});

export default validateStory;
