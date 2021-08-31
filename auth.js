import * as util from './util.js';

// GLOBAL CONSTANTS
const { SALT } = process.env;

const auth = (pool) => (request, response, next) => {
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

export default auth;
