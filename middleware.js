import * as util from './util.js';

// GLOBAL CONSTANTS
const { SALT } = process.env;
const KEYWORDS_COUNT = 3;
const STORY_NOT_FOUND_ERROR_MESSAGE = 'Story not found!';

export const auth = (pool) => (request, response, next) => {
  // set the default value
  request.isUserLoggedIn = false;

  // check to see if the cookies you need exists
  if (request.cookies.loggedIn && request.cookies.userId) {
    // create an unhashed cookie string based on user ID and salt
    const unhashedCookieString = `${request.cookies.userId}-${SALT}`;
    // get the hashed value that should be inside the cookie
    const hash = util.getHash(unhashedCookieString);

    // test the value of the cookie
    if (request.cookies.loggedIn === hash) {
      request.isUserLoggedIn = true;

      // look for this user in the database
      const values = [request.cookies.userId];

      // try to get the user
      pool.query('SELECT * FROM users WHERE id=$1', values, (error, result) => {
        if (error || result.rows.length < 1) {
          response.clearCookie('userId');
          response.clearCookie('loggedIn');
          const errorMessage = 'Your session has expired! Please try logging in again.';
          response.render('login', { userInfo: {}, genericSuccess: {}, genericError: { message: errorMessage } });
          return;
        }

        // set the user as a key in the request object so that it's accessible in the route
        // eslint-disable-next-line prefer-destructuring
        request.user = result.rows[0];

        next();
      });

      // make sure we don't get down to the next() below
      return;
    }
  }

  next();
};

export const checkStoryCollab = (pool) => (request, response, next) => {
  if (!request.isUserLoggedIn) {
    response.redirect('/login');
  } else {
    const { id } = request.params;
    let collabInfo = {};
    let story = {};

    // check if story id exists
    const storyQuery = `SELECT stories.id, stories.created_user_id, users.username AS created_username, stories.title, stories.starting_paragraph_id, starting_paragraphs.paragraph AS starting_paragraph, stories.ending_paragraph_id, ending_paragraphs.paragraph AS ending_paragraph FROM stories INNER JOIN starting_paragraphs ON stories.starting_paragraph_id = starting_paragraphs.id INNER JOIN ending_paragraphs ON stories.ending_paragraph_id = ending_paragraphs.id INNER JOIN users ON stories.created_user_id = users.id WHERE stories.id=${id}`;
    pool
      .query(storyQuery)
      // check if current user is already a collaborator in story
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
        let nextQuery = '';
        if (Object.keys(collabInfo).length > 0) {
          nextQuery = `SELECT * FROM collaborators_stories WHERE collaborator_id=${collabInfo.collaborator_id} AND story_id=${collabInfo.story_id}`;
          return pool.query(nextQuery);
        }
        const values = util.getRandomIds(keywords, KEYWORDS_COUNT);
        nextQuery = `INSERT INTO collaborators_stories (collaborator_id, story_id, keyword1_id, keyword2_id, keyword3_id) VALUES (${request.user.id}, ${id}, $1, $2, $3) RETURNING *`;
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
      // render page, with the keywords to use
      .then((result) => {
        const keywords = [];
        for (let i = 0; i < result.rows.length; i += 1) {
          keywords.push(result.rows[i].keyword);
        }
        const createdUsernameFmt = util.setUiUsername(story.created_username);
        story = { ...story, keywords, createdUsernameFmt };

        // get all paragraphs, starting with the earliest
        const paragraphsQuery = `SELECT * FROM paragraphs WHERE story_id=${id} ORDER BY created_at ASC`;
        return pool.query(paragraphsQuery);
      })
      .then((result) => {
        const paragraphs = (result.rows.length > 0) ? result.rows : [];
        story = {
          ...story,
          paragraphs,
        };
        request.story = story;
        next();
      })
      .catch((error) => {
        if (error.message === STORY_NOT_FOUND_ERROR_MESSAGE) {
          response.status(404).send(`Error 404: ${STORY_NOT_FOUND_ERROR_MESSAGE}`);
        } else {
          response.send(`Error: ${error.message}`);
        }
      });
  }
};
