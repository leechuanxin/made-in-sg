import * as util from './util.js';
import * as globals from './globals.js';

const getStory = (pool, request) => new Promise((resolve, reject) => {
  const { id } = request.params;
  // query to return story if it exists
  const storyQuery = `SELECT stories.id, stories.created_user_id, users.realname AS created_username, stories.title, stories.starting_paragraph_id, starting_paragraphs.paragraph AS starting_paragraph, stories.ending_paragraph_id, ending_paragraphs.paragraph AS ending_paragraph FROM stories INNER JOIN starting_paragraphs ON stories.starting_paragraph_id = starting_paragraphs.id INNER JOIN ending_paragraphs ON stories.ending_paragraph_id = ending_paragraphs.id INNER JOIN users ON stories.created_user_id = users.id WHERE stories.id=${id}`;

  pool
    .query(storyQuery)
    .then((result) => {
      if (result.rows.length === 0) {
        throw new Error(globals.STORY_NOT_FOUND_ERROR_MESSAGE);
      } else {
        const createdUsernameFmt = result.rows[0].created_username;
        const story = {
          ...result.rows[0],
          created_username_fmt: createdUsernameFmt,
          starting_paragraph: result.rows[0].starting_paragraph.split('{{name}}').join(result.rows[0].created_username),
          ending_paragraph: result.rows[0].ending_paragraph.split('{{name}}').join(result.rows[0].created_username),
        };
        resolve(story);
      }
    })
    .catch((error) => {
      reject(new Error(error.message));
    });
});

const getCollabInStory = (pool, request) => (result) => new Promise((resolve, reject) => {
  const collabQuery = `SELECT * FROM collaborators_stories WHERE collaborator_id=${request.user.id} AND story_id=${result.id}`;

  pool
    .query(collabQuery)
    .then((collabQueryResult) => {
      const newResult = {
        ...result,
        collab_story_info: (collabQueryResult.rows.length > 0) ? collabQueryResult.rows[0] : {},
      };
      resolve(newResult);
    })
    .catch((error) => {
      reject(new Error(error.message));
    });
});

const getAllKeywords = (pool) => (result) => new Promise((resolve, reject) => {
  const keywordsQuery = 'SELECT * FROM keywords';
  pool
    .query(keywordsQuery)
    .then((keywordsQueryResult) => {
      const keywords = [...keywordsQueryResult.rows];
      const newResult = {
        ...result,
        all_keywords: keywords,
      };
      resolve(newResult);
    })
    .catch((error) => {
      reject(new Error(error.message));
    });
});

const setOrReuseCollab = (pool, request) => (result) => new Promise((resolve, reject) => {
  const keywords = [...result.all_keywords];
  const collabStoryInfo = { ...result.collab_story_info };
  const insertCollabQuery = `INSERT INTO collaborators_stories (collaborator_id, story_id, keyword1_id, keyword2_id, keyword3_id) VALUES (${request.user.id}, ${result.id}, $1, $2, $3) RETURNING *`;
  if (Object.keys(collabStoryInfo).length > 0) {
    // return promise in the form of result.rows[]
    resolve(result);
  } else {
    const values = util.getRandomIds(keywords, globals.KEYWORDS_COUNT);
    pool
      .query(insertCollabQuery, values)
      .then((insertCollabQueryResult) => {
        const newResult = {
          ...result,
          collab_story_info: insertCollabQueryResult.rows[0],
        };
        resolve(newResult);
      })
      .catch((error) => {
        reject(new Error(error.message));
      });
  }
});

const getKeywordsText = (pool) => (result) => new Promise((resolve, reject) => {
  const keywordIds = [
    result.collab_story_info.keyword1_id,
    result.collab_story_info.keyword2_id,
    result.collab_story_info.keyword3_id,
  ];
  let newResult = {
    ...result,
    keywordIds,
  };
  const getKeywordsQuery = 'SELECT * FROM keywords where id=$1 OR id=$2 OR id=$3';
  pool
    .query(getKeywordsQuery, keywordIds)
    .then((getKeywordsQueryResult) => {
      const keywords = [];
      for (let i = 0; i < getKeywordsQueryResult.rows.length; i += 1) {
        keywords.push(getKeywordsQueryResult.rows[i].keyword);
      }
      newResult = {
        ...newResult,
        keywords,
      };
      resolve(newResult);
    })
    .catch((error) => {
      reject(new Error(error.message));
    });
});

const getAllParagraphs = (pool) => (result) => new Promise((resolve, reject) => {
  const paragraphsQuery = `SELECT paragraphs.id, paragraphs.created_user_id, users.realname AS created_username, paragraphs.last_updated_user_id, paragraphs.story_id, paragraphs.paragraph FROM paragraphs INNER JOIN users ON users.id=paragraphs.created_user_id WHERE story_id=${result.id} ORDER BY id ASC`;
  pool
    .query(paragraphsQuery)
    .then((paragraphsQueryResult) => {
      const paragraphs = (paragraphsQueryResult.rows.length > 0) ? paragraphsQueryResult.rows : [];
      const paragraphsFmt = paragraphs.map((paragraph) => ({
        ...paragraph,
        created_username_fmt: paragraph.created_username,
      }));
      const newResult = {
        ...result,
        paragraphs: paragraphsFmt,
      };
      resolve(newResult);
    })
    .catch((error) => {
      reject(new Error(error.message));
    });
});

const getOrSetStoryCollab = (pool, request) => new Promise((resolve, reject) => {
  getStory(pool, request)
    .then(getCollabInStory(pool, request))
    .then(getAllKeywords(pool))
    .then(setOrReuseCollab(pool, request))
    .then(getKeywordsText(pool))
    .then(getAllParagraphs(pool))
    .then((result) => {
      resolve(result);
    })
    .catch((error) => {
      if (error.message === globals.STORY_NOT_FOUND_ERROR_MESSAGE) {
        reject(new Error(`${globals.STORY_NOT_FOUND_ERROR_MESSAGE}`));
      } else {
        reject(new Error(`${error.message}`));
      }
    });
});

export default getOrSetStoryCollab;
