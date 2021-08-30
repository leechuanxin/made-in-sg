import validateStory from './validation.js';
import * as util from './util.js';

// GLOBAL CONSTANTS
const START_PARA_COUNT = 1;
const END_PARA_COUNT = 1;

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
