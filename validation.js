import * as globals from './globals.js';

const validateStoryTitle = (story) => {
  const obj = {};
  if (!story.title || story.title.trim === '') {
    obj.story_title_invalid = 'Please enter a valid story title.';
  } else if (story.title.length > 100) {
    obj.story_title_invalid = 'Your story title can only be up to 100 characters long!';
  }
  return obj;
};

const validateRealName = (userInfo, type) => {
  const obj = {};
  if (!userInfo.realname || userInfo.realname.trim === '' || /\d/.test(userInfo.realname)) {
    if (type === 'signup') {
      obj.realname_invalid = 'Please enter your real name.';
    }
  }
  return obj;
};

const validateUserName = (userInfo, type) => {
  const regex = /^[a-z0-9_]+$/;
  const obj = {};
  if (!userInfo.username || userInfo.username.trim === '') {
    if (type === 'login') {
      obj.username_invalid = 'Please enter a username.';
    } else {
      obj.username_invalid = 'Please enter a valid username.';
    }
  } else if (userInfo.username.search(regex) === -1) {
    if (type === 'signup') {
      obj.username_invalid = 'Your username should only include numbers, lowercase alphabets, and/or underscores.';
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
  if (paragraph.paragraph.length > globals.PARAGRAPH_CHAR_LIMIT) {
    obj.paragraph_charcount_invalid = `Your new paragraph, inclusive of spaces, must be ${globals.PARAGRAPH_CHAR_LIMIT} characters or less!`;
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
  ...validateRealName(userInfo, 'signup'),
  ...validateUserName(userInfo, 'signup'),
  ...validatePassword(userInfo),
});

export const validateLogin = (userInfo) => ({
  ...userInfo,
  ...validateUserName(userInfo, 'login'),
});
