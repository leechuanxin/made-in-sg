const validateStoryTitle = (story) => {
  const obj = {};
  if (!story.title || story.title.trim === '') {
    obj.story_title_invalid = 'Please enter a valid story title.';
  } else if (story.title.length > 100) {
    obj.story_title_invalid = 'Your story title can only be up to 100 characters long!';
  }
  return obj;
};

const validateUserName = (userInfo, type) => {
  const obj = {};
  if (!userInfo.username || userInfo.username.trim === '') {
    if (type === 'login') {
      obj.username_invalid = 'Please enter a username.';
    } else {
      obj.username_invalid = 'Please enter a valid username.';
    }
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

const validateParagraphValid = (paragraph) => {
  const obj = {};
  if (!paragraph.paragraph || paragraph.paragraph.trim === '') {
    obj.paragraph_invalid = 'Please enter something in your new paragraph.';
  }
  return obj;
};

const validateParagraphCharCount = (paragraph) => {
  const obj = {};
  if (paragraph.paragraph.length > 600) {
    obj.paragraph_charcount_invalid = 'Your new paragraph, inclusive of spaces, must be 600 characters or less!';
  }
  return obj;
};

const validateParagraphKeywords = (paragraph, keywords) => {
  const lowercasePara = paragraph.paragraph.toLowerCase();
  const obj = {};
  const keywordsUnused = [];
  keywords.forEach((keyword) => {
    if (lowercasePara.indexOf(keyword) < 0) {
      keywordsUnused.push(keyword);
    }
  });
  if (keywordsUnused.length > 0) {
    obj.paragraph_keywords_invalid = `Please use the following keywords in your new paragraph at least once: ${keywordsUnused.join(', ')}.`;
  }
  return obj;
};

export const validateParagraph = (paragraph, keywords) => ({
  ...paragraph,
  ...validateParagraphValid(paragraph),
  ...validateParagraphCharCount(paragraph),
  ...validateParagraphKeywords(paragraph, keywords),
});

export const validateUserInfo = (userInfo) => ({
  ...userInfo,
  ...validateUserName(userInfo, 'signup'),
  ...validatePassword(userInfo),
});

export const validateLogin = (userInfo) => ({
  ...userInfo,
  ...validateUserName(userInfo, 'login'),
});
