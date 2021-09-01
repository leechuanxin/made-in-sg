// CUSTOM IMPORTS
import * as validation from './validation.js';
import * as util from './util.js';

// GLOBAL CONSTANTS
const { SALT } = process.env;
const START_PARA_COUNT = 1;
const END_PARA_COUNT = 1;
const USERNAME_EXISTS_ERROR_MESSAGE = 'Username exists!';
const LOGIN_FAILED_ERROR_MESSAGE = 'Login failed!';
const STORY_NOT_FOUND_ERROR_MESSAGE = 'Story not found!';

export const handleIndex = (pool) => (request, response) => {
  // retrieve all stories, sorted latest (created) first
  const storiesQuery = 'SELECT stories.id, stories.created_user_id, users.username AS created_username, stories.created_at, stories.title, stories.starting_paragraph_id, starting_paragraphs.paragraph AS starting_paragraph, stories.ending_paragraph_id, ending_paragraphs.paragraph AS ending_paragraph FROM stories INNER JOIN starting_paragraphs ON stories.starting_paragraph_id = starting_paragraphs.id INNER JOIN ending_paragraphs ON stories.ending_paragraph_id = ending_paragraphs.id INNER JOIN users ON stories.created_user_id = users.id ORDER BY stories.created_at DESC';
  pool
    .query(storiesQuery)
    .then((result) => {
      const stories = result.rows.map((story) => ({
        ...story,
        created_username_fmt: util.setUiUsername(story.created_username),
        summary: util.setStorySummary(story.starting_paragraph),
      }));
      response.render('index', { user: request.user, stories });
    });
};

export const handleGetNewStory = (request, response) => {
  if (!request.isUserLoggedIn) {
    response.redirect('/login');
  } else {
    response.render('createstory', { user: request.user, story: {} });
  }
};

export const handlePostNewStory = (pool) => (request, response) => {
  const story = request.body;
  const validatedStory = validation.validateStory(story);
  const invalidRequests = util.getInvalidFormRequests(validatedStory);

  if (!request.isUserLoggedIn) {
    const errorMessage = 'You have to be logged in to create a new story!';
    response.render('login', { userInfo: {}, genericSuccess: {}, genericError: { message: errorMessage } });
  } else if (invalidRequests.length > 0) {
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
        const titleFmt = validatedStory.title.split("'").join("''");
        const newStoryQuery = `INSERT INTO stories (created_user_id, last_updated_user_id, starting_paragraph_id, ending_paragraph_id, title) VALUES (${request.user.id}, ${request.user.id}, ${randomStartParaId}, ${randomEndParaId}, '${titleFmt}') RETURNING *`;
        return pool.query(newStoryQuery);
      })
      .then((result) => {
        response.redirect(`/story/${result.rows[0].id}`);
      })
      .catch((error) => {
        response.send(`error: ${error.stack}`);
      });
  }
};

export const handleGetStory = (pool) => (request, response) => {
  const { id } = request.params;
  const storyQuery = `SELECT stories.id, stories.created_user_id, users.username AS created_username, stories.title, stories.starting_paragraph_id, starting_paragraphs.paragraph AS starting_paragraph, stories.ending_paragraph_id, ending_paragraphs.paragraph AS ending_paragraph FROM stories INNER JOIN starting_paragraphs ON stories.starting_paragraph_id = starting_paragraphs.id INNER JOIN ending_paragraphs ON stories.ending_paragraph_id = ending_paragraphs.id INNER JOIN users ON stories.created_user_id = users.id WHERE stories.id=${id}`;
  pool
    .query(storyQuery)
    .then((result) => {
      if (result.rows.length === 0) {
        throw new Error(STORY_NOT_FOUND_ERROR_MESSAGE);
      } else {
        const createdUsernameFmt = util.setUiUsername(result.rows[0].created_username);
        response.render('viewstory', { user: request.user, story: { created_username_fmt: createdUsernameFmt, ...result.rows[0] } });
      }
    })
    .catch((error) => {
      if (error.message === STORY_NOT_FOUND_ERROR_MESSAGE) {
        response.status(404).send(`Error 404: ${STORY_NOT_FOUND_ERROR_MESSAGE}`);
      } else {
        response.send(`Error: ${error.message}`);
      }
    });
};

export const handleGetStoryParagraph = (request, response) => {
  response.render('add_story_paragraph', { user: request.user, story: request.story, paragraph: {} });
};

export const handlePostStoryParagraph = (pool) => (request, response) => {
  const paragraph = request.body;
  const validatedParagraph = validation.validateParagraph(paragraph, request.story.keywords);
  const invalidRequests = util.getInvalidFormRequests(validatedParagraph);

  if (!request.isUserLoggedIn) {
    const errorMessage = 'You have to be logged in to add a new paragraph!';
    response.render('login', { userInfo: {}, genericSuccess: {}, genericError: { message: errorMessage } });
  } else if (invalidRequests.length > 0) {
    const invalidReqText = invalidRequests.map((req) => validatedParagraph[req]).join(' ');
    response.render('add_story_paragraph', {
      user: request.user,
      story: request.story,
      paragraph: { ...validatedParagraph, invalidReqText },
    });
  } else {
    const paragraphFmt = validatedParagraph.paragraph.replace(/[\r\n\v]+/g, ' ').split("'").join("''");
    const newParaQuery = `INSERT INTO paragraphs (created_user_id, last_updated_user_id, story_id, paragraph) VALUES (${request.user.id}, ${request.user.id}, ${request.params.id}, '${paragraphFmt}') RETURNING *`;
    pool
      .query(newParaQuery)
      .then((result) => {
        response.redirect(`/story/${result.rows[0].story_id}`);
      })
      .catch((error) => {
        const invalidReqText = `Error: ${error.message}`;
        response.render('add_story_paragraph', {
          user: request.user,
          story: request.story,
          paragraph: { ...validatedParagraph, invalidReqText },
        });
      });
  }
};

export const handleGetSignup = (request, response) => {
  if (request.isUserLoggedIn) {
    response.redirect('/');
  } else {
    response.render('signup', { user: {}, userInfo: {}, genericError: {} });
  }
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
    const nameFmt = validatedUserInfo.username.split("'").join("''");
    const username = util.setDbUsername(nameFmt);

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
      .then(() => {
        const successMessage = 'You have registered successfully! Please log in.';
        response.render('login', { userInfo: {}, genericSuccess: { message: successMessage }, genericError: {} });
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

export const handleGetLogin = (request, response) => {
  if (request.isUserLoggedIn) {
    response.redirect('/');
  } else {
    response.render('login', {
      user: {}, userInfo: {}, genericSuccess: {}, genericError: {},
    });
  }
};

export const handlePostLogin = (pool) => (request, response) => {
  const userInfo = request.body;
  const validatedLogin = validation.validateLogin(userInfo);
  const invalidRequests = util.getInvalidFormRequests(validatedLogin);
  if (invalidRequests.length > 0) {
    response.render('login', {
      userInfo: validatedLogin,
      genericSuccess: {},
      genericError: {},
    });
  } else {
    const nameFmt = validatedLogin.username.split("'").join("''");
    const username = util.setDbUsername(nameFmt);
    const usernameQuery = `SELECT * from users WHERE username='${username}'`;

    pool
      .query(usernameQuery)
      .then((result) => {
        if (result.rows.length === 0) {
          // we didnt find a user with that email.
          // the error for password and user are the same.
          // don't tell the user which error they got for security reasons,
          // otherwise people can guess if a person is a user of a given service.
          throw new Error(LOGIN_FAILED_ERROR_MESSAGE);
        } else {
          // get user record from results
          const user = result.rows[0];
          // get the hashed password as output from the SHA object
          const hashedPassword = util.getHash(validatedLogin.password);
          // If the user's hashed password in the database
          // does not match the hashed input password, login fails
          if (user.password !== hashedPassword) {
            // the error for incorrect email and incorrect password
            // are the same for security reasons.
            // This is to prevent detection of whether a user has an account for a given service.
            throw new Error(LOGIN_FAILED_ERROR_MESSAGE);
          } else {
            // create an unhashed cookie string based on user ID and salt
            const unhashedCookieString = `${result.rows[0].id}-${SALT}`;
            // generate a hashed cookie string using SHA object
            const hashedCookieString = util.getHash(unhashedCookieString);
            // set the loggedIn and userId cookies in the response
            // The user's password hash matches that in the DB and we authenticate the user.
            response.cookie('loggedIn', hashedCookieString);
            response.cookie('userId', result.rows[0].id);
            response.redirect('/');
          }
        }
      })
      .catch((error) => {
        let errorMessage = '';
        if (error.message === LOGIN_FAILED_ERROR_MESSAGE) {
          errorMessage = 'There has been an error. Please ensure that you have the correct name or password.';
        } else {
          errorMessage = error.message;
        }

        response.render('login', { userInfo: validatedLogin, genericSuccess: {}, genericError: { message: errorMessage } });
      });
  }
};

export const handleLogout = (request, response) => {
  if (request.isUserLoggedIn) {
    response.clearCookie('userId');
    response.clearCookie('loggedIn');
    response.redirect('/');
  } else {
    response.status(403).send('Error logging out!');
  }
};
