import * as util from './util.js';

// GLOBAL CONSTANTS
const KEYWORDS_COUNT = 3;
const STORY_NOT_FOUND_ERROR_MESSAGE = 'Story not found!';

const checkStoryCollab = (pool, request) => new Promise((resolve, reject) => {
  const { id } = request.params;
  let collabInfo = {};
  let story = {};

  // check if story id exists
  const storyQuery = `SELECT stories.id, stories.created_user_id, users.username AS created_username, stories.title, stories.starting_paragraph_id, starting_paragraphs.paragraph AS starting_paragraph, stories.ending_paragraph_id, ending_paragraphs.paragraph AS ending_paragraph FROM stories INNER JOIN starting_paragraphs ON stories.starting_paragraph_id = starting_paragraphs.id INNER JOIN ending_paragraphs ON stories.ending_paragraph_id = ending_paragraphs.id INNER JOIN users ON stories.created_user_id = users.id WHERE stories.id=${id}`;

  pool
    // check if current user is already a collaborator in story
    .query(storyQuery)
    .then((result) => {
      if (result.rows.length === 0) {
        throw new Error(STORY_NOT_FOUND_ERROR_MESSAGE);
      } else {
        if (result.rows.length > 0) {
          story = { ...result.rows[0] };
        }

        const collabQuery = `SELECT * FROM collaborators_stories WHERE collaborator_id=${request.user.id} AND story_id=${id}`;

        return pool.query(collabQuery);
      }
    })
    // retrieve all keywords
    .then((result) => {
      if (result.rows.length > 0) {
        collabInfo = {
          ...collabInfo,
          ...result.rows[0],
        };
      }
      const keywordsQuery = 'SELECT * FROM keywords';
      return pool.query(keywordsQuery);
    })
    // if current user is already collaborator, use existing keywords
    // else, add entry that user is now collaborator, assign 3 random keywords
    .then((result) => {
      const keywords = [...result.rows];
      const nextQuery = `INSERT INTO collaborators_stories (collaborator_id, story_id, keyword1_id, keyword2_id, keyword3_id) VALUES (${request.user.id}, ${id}, $1, $2, $3) RETURNING *`;
      if (Object.keys(collabInfo).length > 0) {
        // return promise in the form of result.rows[]
        return Promise.resolve({
          rows: [
            { ...collabInfo },
          ],
        });
      }
      const values = util.getRandomIds(keywords, KEYWORDS_COUNT);
      return pool.query(nextQuery, values);
    })
    // get the text form of the 3 assigned keywords
    .then((result) => {
      const keywordIds = [
        result.rows[0].keyword1_id,
        result.rows[0].keyword2_id,
        result.rows[0].keyword3_id,
      ];
      story = { ...story, keywordIds };
      const getKeywordsQuery = 'SELECT * FROM keywords where id=$1 OR id=$2 OR id=$3';
      return pool.query(getKeywordsQuery, keywordIds);
    })
    // insert keywords and formatted username
    .then((result) => {
      const keywords = [];
      for (let i = 0; i < result.rows.length; i += 1) {
        keywords.push(result.rows[i].keyword);
      }
      const createdUsernameFmt = util.setUiUsername(story.created_username);
      story = { ...story, keywords, createdUsernameFmt };

      // get all paragraphs, starting with the earliest
      const paragraphsQuery = `SELECT * FROM paragraphs WHERE story_id=${id} ORDER BY id ASC`;
      return pool.query(paragraphsQuery);
    })
    // insert list of paragraphs
    .then((result) => {
      const paragraphs = (result.rows.length > 0) ? result.rows : [];
      story = {
        ...story,
        paragraphs,
      };
      resolve(story);
    })
    .catch((error) => {
      if (error.message === STORY_NOT_FOUND_ERROR_MESSAGE) {
        reject(new Error(`${STORY_NOT_FOUND_ERROR_MESSAGE}`));
      } else {
        reject(new Error(`${error.message}`));
      }
    });
});

export default checkStoryCollab;
