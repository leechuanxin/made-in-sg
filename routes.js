import validateStory from './validation.js';
import * as util from './util.js';

export const handleGetNewStory = (request, response) => {
  response.render('createstory', { story: {} });
};

export const handlePostNewStory = (pool) => (request, response) => {
  const story = request.body;
  const validatedStory = validateStory(story);
  const invalidRequests = util.getInvalidFormRequests(validatedStory);

  if (invalidRequests.length > 0) {
    response.render('createstory', {
      story: validatedStory,
    });
  } else {
    const query = `INSERT INTO stories (title) VALUES ('${story.title}') RETURNING *`;
    pool
      .query(query)
      .then((result) => {
        response.send(`success: ${result.rows[0].title}`);
      });
  }
};
