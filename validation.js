const validateStoryTitle = (story) => {
  const obj = {};
  if (!story.title || story.title.trim === '') {
    obj.story_title_invalid = 'Please enter a valid story title.';
  } else if (story.title.length > 100) {
    obj.story_title_invalid = 'Your story title can only be up to 100 characters long!';
  }
  return obj;
};

const validateUserName = (userInfo) => {
  const obj = {};
  if (!userInfo.username || userInfo.username.trim === '') {
    obj.username_invalid = 'Please enter a valid username.';
  }
  return obj;
};

const validatePassword = (userInfo) => {
  const obj = {};
  if (!userInfo.password || userInfo.password.trim === '' || userInfo.password.length < 8) {
    obj.password_invalid = 'Please enter a valid password of at least 8 characters long.';
  }
  return obj;
};

export const validateStory = (story) => ({
  ...story,
  ...validateStoryTitle(story),
});

export const validateUserInfo = (userInfo) => ({
  ...userInfo,
  ...validateUserName(userInfo),
  ...validatePassword(userInfo),
});

export default validateStory;
