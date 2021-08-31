import jsSHA from 'jssha';

// CUSTOM IMPORTS
import * as validation from './validation.js';
import * as util from './util.js';

// GLOBAL CONSTANTS
const { SALT } = process.env;
const START_PARA_COUNT = 1;
const END_PARA_COUNT = 1;
const USERNAME_EXISTS_ERROR_MESSAGE = 'Username exists!';
const LOGIN_FAILED_ERROR_MESSAGE = 'Login failed!';

export const handleGetNewStory = (request, response) => {
  if (!request.isUserLoggedIn) {
    response.redirect('/login');
  } else {
    response.render('createstory', { story: {} });
  }
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
  if (request.isUserLoggedIn) {
    response.redirect('/');
  } else {
    response.render('signup', { userInfo: {}, genericError: {} });
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

export const handleGetLogin = (request, response) => {
  if (request.isUserLoggedIn) {
    response.redirect('/');
  } else {
    response.render('login', { userInfo: {}, genericError: {} });
  }
};

export const handlePostLogin = (pool) => (request, response) => {
  const userInfo = request.body;
  const validatedLogin = validation.validateLogin(userInfo);
  const invalidRequests = util.getInvalidFormRequests(validatedLogin);
  if (invalidRequests.length > 0) {
    response.render('login', {
      userInfo: validatedLogin,
      genericError: {},
    });
  } else {
    const username = util.setDbUsername(request.body.username);
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
            // create new SHA object for cookie
            // eslint-disable-next-line new-cap
            const shaObjCookie = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });
            // create an unhashed cookie string based on user ID and salt
            const unhashedCookieString = `${result.rows[0].id}-${SALT}`;
            // generate a hashed cookie string using SHA object
            shaObjCookie.update(unhashedCookieString);
            const hashedCookieString = shaObjCookie.getHash('HEX');
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

        response.render('login', { userInfo: validatedLogin, genericError: { message: errorMessage } });
      });
  }
};
