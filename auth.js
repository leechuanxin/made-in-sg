import * as util from './util.js';

const auth = (pool) => (request, response, next) => {
  // set the default value
  request.isUserLoggedIn = false;

  // check to see if the cookies you need exists
  if (request.cookies.loggedIn && request.cookies.userId) {
    // get the hased value that should be inside the cookie
    const hash = util.getHash(request.cookies.userId);

    // test the value of the cookie
    if (request.cookies.loggedIn === hash) {
      request.isUserLoggedIn = true;

      // look for this user in the database
      const values = [request.cookies.userId];

      // try to get the user
      pool.query('SELECT * FROM users WHERE id=$1', values, (error, result) => {
        if (error || result.rows.length < 1) {
          response.status(503).send('sorry!');
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
