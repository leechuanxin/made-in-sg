import * as validation from './validation.js';
import * as util from './util.js';

// GLOBAL CONSTANTS
const START_PARA_COUNT = 1;
const END_PARA_COUNT = 1;
const USERNAME_EXISTS_ERROR_MESSAGE = 'Username exists!';

export const handleGetNewStory = (request, response) => {
  response.render('createstory', { story: {} });
};

export const handlePostNewStory = (pool) => (request, response) => {
  const story = request.body;
  const validatedStory = validation.validateStory(story);
  const invalidRequests = util.getInvalidFormRequests(validatedStory);

  if (invalidRequests.length > 0) {
    response.render('createstory', {
      story: validatedStory,
    });
  } else {
    const startParaQuery = 'SELECT * FROM starting_paragraphs';
    const endParaQuery = 'SELECT * FROM ending_paragraphs';
    let randomStartParaId = 0;
    let randomEndParaId = 0;
    pool
      .query(startParaQuery)
      .then((result) => {
        const startParas = [...result.rows];
        randomStartParaId = util.getRandomIds(startParas, START_PARA_COUNT);
        return pool.query(endParaQuery);
      })
      .then((result) => {
        const endParas = [...result.rows];
        randomEndParaId = util.getRandomIds(endParas, END_PARA_COUNT);
        const newStoryQuery = `INSERT INTO stories (starting_paragraph_id, ending_paragraph_id, title) VALUES (${randomStartParaId}, ${randomEndParaId}, '${validatedStory.title}') RETURNING *`;
        return pool.query(newStoryQuery);
      })
      .then((result) => {
        response.send(`success: ${result.rows[0].title}`);
      })
      .catch((error) => {
        response.send(`error: ${error.stack}`);
      });
  }
};

export const handleGetSignup = (request, response) => {
  response.render('signup', { userInfo: {}, genericError: {} });
};

export const handlePostSignup = (pool) => (request, response) => {
  const userInfo = request.body;
  const validatedUserInfo = validation.validateUserInfo(userInfo);
  const invalidRequests = util.getInvalidFormRequests(validatedUserInfo);
  if (invalidRequests.length > 0) {
    response.render('signup', {
      userInfo: validatedUserInfo,
      genericError: {},
    });
  } else {
    // get the hashed password as output from the SHA object
    const hashedPassword = util.getHash(validatedUserInfo.password);
    const username = util.setDbUsername(validatedUserInfo.username);

    const usernameQuery = `SELECT * FROM users WHERE username='${username}'`;
    pool
      .query(usernameQuery)
      .then((result) => {
        if (result.rows.length > 0) {
          throw new Error(USERNAME_EXISTS_ERROR_MESSAGE);
        } else {
          const values = [username, hashedPassword];
          const newUserQuery = 'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *';
          return pool.query(newUserQuery, values);
        }
      })
      .then((result) => {
        response.send(`success: ${result.rows[0].username}`);
      })
      .catch((error) => {
        let errorMessage = '';
        if (error.message === USERNAME_EXISTS_ERROR_MESSAGE) {
          errorMessage = 'There has been an error. Please try registering again with a proper name and password.';
        } else {
          errorMessage = error.message;
        }

        response.render('signup', { userInfo: {}, genericError: { message: errorMessage } });
      });
  }
};
