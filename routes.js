// CUSTOM IMPORTS
import * as validation from './validation.js';
import * as util from './util.js';
import getOrSetStoryCollab from './promises.js';
import * as globals from './globals.js';

export const handleIndex = (pool) => (request, response) => {
  // retrieve all stories, sorted latest (created) first
  const storiesQuery = 'SELECT stories.id, stories.created_user_id, users.realname AS created_username, stories.created_at, stories.title, stories.starting_paragraph_id, starting_paragraphs.paragraph AS starting_paragraph, stories.ending_paragraph_id, ending_paragraphs.paragraph AS ending_paragraph, stories.street FROM stories INNER JOIN starting_paragraphs ON stories.starting_paragraph_id = starting_paragraphs.id INNER JOIN ending_paragraphs ON stories.ending_paragraph_id = ending_paragraphs.id INNER JOIN users ON stories.created_user_id = users.id ORDER BY stories.created_at DESC';
  pool
    .query(storiesQuery)
    .then((result) => {
      const stories = result.rows.map((story) => {
        const newStartingParagraph = story.starting_paragraph.split('{{name}}').join(story.created_username).split('{{street}}').join(story.street);
        return {
          ...story,
          created_username_fmt: story.created_username,
          starting_paragraph: newStartingParagraph,
          ending_paragraph: story.ending_paragraph.split('{{name}}').join(story.created_username).split('{{street}}').join(story.street),
          summary: util.setStorySummary(newStartingParagraph),
        };
      });
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
    const streetQuery = 'SELECT * FROM streets';
    let randomStartParaId = 0;
    let randomEndParaId = 0;
    let randomStreetText = '';
    pool
      .query(streetQuery)
      .then((result) => {
        const streets = [...result.rows];
        const randomStreetId = util.getRandomIds(streets, globals.START_PARA_COUNT);
        randomStreetText = result.rows[randomStreetId - 1].street.split("'").join("''");
        return pool.query(startParaQuery);
      })
      .then((result) => {
        const startParas = [...result.rows];
        randomStartParaId = util.getRandomIds(startParas, globals.START_PARA_COUNT);
        return pool.query(endParaQuery);
      })
      .then((result) => {
        const endParas = [...result.rows];
        randomEndParaId = util.getRandomIds(endParas, globals.END_PARA_COUNT);
        const titleFmt = validatedStory.title.split("'").join("''");
        const newStoryQuery = `INSERT INTO stories (created_user_id, last_updated_user_id, starting_paragraph_id, ending_paragraph_id, title, street) VALUES (${request.user.id}, ${request.user.id}, ${randomStartParaId}, ${randomEndParaId}, '${titleFmt}', '${randomStreetText}') RETURNING *`;
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

export const handleDeleteStory = (pool) => (request, response) => {
  if (!request.isUserLoggedIn) {
    const errorMessage = 'You have to be logged in to delete a story!';
    response.render('login', { userInfo: {}, genericSuccess: {}, genericError: { message: errorMessage } });
  } else {
    const storyQuery = `SELECT * FROM stories WHERE id=${request.params.id}`;
    pool
      .query(storyQuery)
      .then((result) => {
        if (result.rows.length === 0) {
          throw new Error(globals.STORY_NOT_FOUND_ERROR_MESSAGE);
        } else {
          const matchStoryUserQuery = `SELECT * FROM stories WHERE id=${request.params.id} AND created_user_id=${request.user.id}`;
          return pool.query(matchStoryUserQuery);
        }
      })
      .then((result) => {
        if (result.rows.length === 0) {
          throw new Error(globals.ACCESS_CONTROL_DELETE_PARAGRAPH_ERROR_MESSAGE);
        } else {
          const matchParaKeysToStoryQuery = `SELECT paragraphs_keywords.id, paragraphs.story_id FROM paragraphs_keywords INNER JOIN paragraphs ON paragraphs_keywords.paragraph_id=paragraphs.id WHERE paragraphs.story_id=${request.params.id}`;
          return pool.query(matchParaKeysToStoryQuery);
        }
      })
      .then((result) => {
        const ids = [];
        result.rows.forEach((row) => {
          ids.push(row.id);
        });
        const deleteAllParaKeysQuery = `DELETE FROM paragraphs_keywords WHERE id IN (${ids.join(', ')})`;
        const deleteAllCollabStoriesQuery = `DELETE FROM collaborators_stories WHERE story_id=${request.params.id}`;
        const deleteParagraphsQuery = `DELETE FROM paragraphs WHERE story_id=${request.params.id}`;
        const deleteStoryQuery = `DELETE FROM stories WHERE id=${request.params.id}`;

        if (ids.length > 0) {
          return Promise.all(
            [
              pool.query(deleteAllParaKeysQuery),
              pool.query(deleteAllCollabStoriesQuery),
              pool.query(deleteParagraphsQuery),
              pool.query(deleteStoryQuery),
            ],
          );
        }

        return Promise.all(
          [
            pool.query(deleteAllCollabStoriesQuery),
            pool.query(deleteParagraphsQuery),
            pool.query(deleteStoryQuery),
          ],
        );
      })
      .then(() => {
        response.redirect('/');
      })
      .catch((error) => {
        response.send(`Error: ${error.message}`);
      });
  }
};

export const handleGetStory = (pool) => (request, response) => {
  const { id } = request.params;
  let story = {};
  const storyQuery = `SELECT stories.id, stories.created_user_id, users.realname AS created_username, stories.title, stories.starting_paragraph_id, starting_paragraphs.paragraph AS starting_paragraph, stories.ending_paragraph_id, ending_paragraphs.paragraph AS ending_paragraph, stories.street FROM stories INNER JOIN starting_paragraphs ON stories.starting_paragraph_id = starting_paragraphs.id INNER JOIN ending_paragraphs ON stories.ending_paragraph_id = ending_paragraphs.id INNER JOIN users ON stories.created_user_id = users.id WHERE stories.id=${id}`;
  pool
    .query(storyQuery)
    .then((result) => {
      if (result.rows.length === 0) {
        throw new Error(globals.STORY_NOT_FOUND_ERROR_MESSAGE);
      } else {
        const createdUsernameFmt = result.rows[0].created_username;
        story = {
          created_username_fmt: createdUsernameFmt,
          ...result.rows[0],
          starting_paragraph: result.rows[0].starting_paragraph.split('{{name}}').join(result.rows[0].created_username).split('{{street}}').join(result.rows[0].street),
          ending_paragraph: result.rows[0].ending_paragraph.split('{{name}}').join(result.rows[0].created_username).split('{{street}}').join(result.rows[0].street),
        };
        // get all paragraphs, starting with the earliest
        const paragraphsQuery = `SELECT paragraphs.id, paragraphs.created_user_id, users.realname AS created_username, paragraphs.last_updated_user_id, paragraphs.story_id, paragraphs.paragraph FROM paragraphs INNER JOIN users ON users.id=paragraphs.created_user_id WHERE story_id=${id} ORDER BY id ASC`;
        return pool.query(paragraphsQuery);
      }
    })
    .then((result) => {
      const paragraphs = (result.rows.length > 0) ? result.rows : [];
      const paragraphsFmt = paragraphs.map((paragraph) => ({
        ...paragraph,
        created_username_fmt: paragraph.created_username,
      }));
      story = {
        ...story,
        paragraphs: paragraphsFmt,
      };
      response.render('viewstory', { user: request.user, story });
    })
    .catch((error) => {
      if (error.message === globals.STORY_NOT_FOUND_ERROR_MESSAGE) {
        response.status(404).send(`Error 404: ${globals.STORY_NOT_FOUND_ERROR_MESSAGE}`);
      } else {
        response.send(`Error: ${error.message}`);
      }
    });
};

export const handleGetStoryParagraph = (pool) => (request, response) => {
  if (!request.isUserLoggedIn) {
    response.redirect('/login');
  } else {
    getOrSetStoryCollab(pool, request)
      .then((result) => {
        const story = {
          ...result,
        };
        response.render('add_story_paragraph', { user: request.user, story, paragraph: {} });
      })
      .catch((error) => {
        if (error.message === globals.STORY_NOT_FOUND_ERROR_MESSAGE) {
          response.status(404).send(`Error 404: ${globals.STORY_NOT_FOUND_ERROR_MESSAGE}`);
        } else {
          response.send(`Error: ${error.message}`);
        }
      });
  }
};

export const handlePostStoryParagraph = (pool) => (request, response) => {
  if (!request.isUserLoggedIn) {
    const errorMessage = 'You have to be logged in to add a new paragraph!';
    response.render('login', { userInfo: {}, genericSuccess: {}, genericError: { message: errorMessage } });
  } else {
    let invalidRequests = [];
    let validatedParagraph = {};
    let story = {};
    getOrSetStoryCollab(pool, request)
      .then((result) => {
        const paragraph = request.body;
        story = result;
        validatedParagraph = validation.validateParagraph(paragraph, result.keywords);
        invalidRequests = util.getInvalidFormRequests(validatedParagraph);
        if (invalidRequests.length > 0) {
          throw new Error(globals.INVALID_NEW_PARAGRAPH_ERROR_MESSAGE);
        } else {
          const paragraphFmt = validatedParagraph.paragraph.replace(/[\r\n\v]+/g, ' ').split("'").join("''");
          const newParaQuery = `INSERT INTO paragraphs (created_user_id, last_updated_user_id, story_id, paragraph) VALUES (${request.user.id}, ${request.user.id}, ${request.params.id}, '${paragraphFmt}') RETURNING *`;
          pool
            .query(newParaQuery)
            .then((newParaQueryResult) => {
              const newParaId = newParaQueryResult.rows[0].id;
              const newParaKeywordIds = [
                result.collab_story_info.keyword1_id,
                result.collab_story_info.keyword2_id,
                result.collab_story_info.keyword3_id,
              ];
              const newParaKeywordQuery = `INSERT INTO paragraphs_keywords (paragraph_id, keyword_id) VALUES (${newParaId}, $1), (${newParaId}, $2), (${newParaId}, $3)`;
              return pool.query(newParaKeywordQuery, newParaKeywordIds);
            })
            .then(() => {
              const keywordsQuery = 'SELECT * FROM keywords';
              return pool.query(keywordsQuery);
            })
            .then((keywordsQueryResult) => {
              const keywords = [...keywordsQueryResult.rows];
              const values = util.getRandomIds(keywords, globals.KEYWORDS_COUNT);
              const updateCollabQuery = `UPDATE collaborators_stories SET keyword1_id=$1, keyword2_id=$2, keyword3_id=$3 WHERE collaborator_id=${request.user.id} AND story_id=${request.params.id} RETURNING *`;
              return pool.query(updateCollabQuery, values);
            })
            .then((updateCollabQueryResult) => {
              response.redirect(`/story/${updateCollabQueryResult.rows[0].story_id}`);
            })
            .catch((error) => {
              throw new Error(`${error.message}`);
            });
        }
      })
      .catch((error) => {
        let invalidReqText = '';
        if (error.message === globals.INVALID_NEW_PARAGRAPH_ERROR_MESSAGE) {
          invalidReqText = invalidRequests.map((req) => validatedParagraph[req]).join(' ');
        } else {
          invalidReqText = `Error: ${error.message}`;
        }
        response.render('add_story_paragraph', {
          user: request.user,
          story,
          paragraph: { ...validatedParagraph, invalidReqText },
        });
      });
  }
};

export const handleGetEditParagraph = (pool) => (request, response) => {
  if (!request.isUserLoggedIn) {
    response.redirect('/login');
  } else {
    const checkStoryParaQuery = `SELECT paragraphs.id, paragraphs.created_user_id, paragraphs.last_updated_user_id, paragraphs.created_at, paragraphs.last_updated_at, paragraphs.story_id, paragraphs.paragraph, stories.created_user_id AS story_creator_id FROM paragraphs INNER JOIN stories ON paragraphs.story_id = stories.id WHERE paragraphs.id=${request.params.paragraphId} AND paragraphs.story_id=${request.params.storyId}`;
    pool
      .query(checkStoryParaQuery)
      // check access control, or if paragraph exists in story
      .then((checkStoryParaResult) => {
        if (checkStoryParaResult.rows.length === 0) {
          throw new Error(globals.NO_PARAGRAPH_EXISTS_ERROR_MESSAGE);
        } else if (
          checkStoryParaResult.rows[0].created_user_id !== request.user.id
          && checkStoryParaResult.rows[0].story_creator_id !== request.user.id
        ) {
          throw new Error(globals.ACCESS_CONTROL_EDIT_PARAGRAPH_ERROR_MESSAGE);
        } else {
          const obj = {
            ...checkStoryParaResult.rows[0],
            paragraph: {
              paragraph: checkStoryParaResult.rows[0].paragraph,
            },
          };
          return Promise.resolve(obj);
        }
      })
      // get story
      .then(
        (result) => new Promise((resolve, reject) => {
          const storyQuery = `SELECT stories.created_user_id, users.realname AS created_username, stories.title, stories.starting_paragraph_id, starting_paragraphs.paragraph AS starting_paragraph, stories.ending_paragraph_id, ending_paragraphs.paragraph AS ending_paragraph, stories.street FROM stories INNER JOIN starting_paragraphs ON stories.starting_paragraph_id = starting_paragraphs.id INNER JOIN ending_paragraphs ON stories.ending_paragraph_id = ending_paragraphs.id INNER JOIN users ON stories.created_user_id = users.id WHERE stories.id=${request.params.storyId}`;
          pool
            .query(storyQuery)
            .then((storyQueryResult) => {
              if (storyQueryResult.rows.length === 0) {
                throw new Error(globals.STORY_NOT_FOUND_ERROR_MESSAGE);
              } else {
                const createdUsernameFmt = storyQueryResult.rows[0].created_username;
                const obj = {
                  created_username_fmt: createdUsernameFmt,
                  ...storyQueryResult.rows[0],
                  ...result,
                  starting_paragraph: storyQueryResult.rows[0].starting_paragraph.split('{{name}}').join(storyQueryResult.rows[0].created_username).split('{{street}}').join(storyQueryResult.rows[0].street),
                  ending_paragraph: storyQueryResult.rows[0].ending_paragraph.split('{{name}}').join(storyQueryResult.rows[0].created_username).split('{{street}}').join(storyQueryResult.rows[0].street),
                };
                resolve(obj);
              }
            })
            .catch((error) => {
              reject(new Error(error.message));
            });
        }),
      )
      // get keyword ids
      .then(
        (result) => new Promise((resolve, reject) => {
          const paraKeywordsQuery = `SELECT * FROM paragraphs_keywords WHERE paragraph_id=${result.id}`;
          pool
            .query(paraKeywordsQuery)
            .then((paraKeywordsResult) => {
              if (paraKeywordsResult.rows.length < 3) {
                throw new Error(globals.NO_PARAGRAPH_EXISTS_ERROR_MESSAGE);
              } else {
                const obj = {
                  ...result,
                  keywordIds: [
                    paraKeywordsResult.rows[0].keyword_id,
                    paraKeywordsResult.rows[1].keyword_id,
                    paraKeywordsResult.rows[2].keyword_id,
                  ],
                };
                resolve(obj);
              }
            })
            .catch((error) => {
              reject(new Error(error.message));
            });
        }),
      )
      // match keyword ids with text
      .then(
        (result) => new Promise((resolve, reject) => {
          const { keywordIds } = result;
          const matchKeywordsQuery = 'SELECT * FROM keywords WHERE id=$1 OR id=$2 OR id=$3';
          pool
            .query(matchKeywordsQuery, keywordIds)
            .then((matchKeywordsResult) => {
              const obj = {
                ...result,
                keywords: [
                  matchKeywordsResult.rows[0].keyword,
                  matchKeywordsResult.rows[1].keyword,
                  matchKeywordsResult.rows[2].keyword,
                ],
              };
              resolve(obj);
            })
            .catch((error) => {
              reject(new Error(error.message));
            });
        }),
      )
      // get all paragraphs
      .then(
        (result) => new Promise((resolve, reject) => {
          const paragraphsQuery = `SELECT paragraphs.id, paragraphs.created_user_id, users.realname AS created_username, paragraphs.last_updated_user_id, paragraphs.story_id, paragraphs.paragraph FROM paragraphs INNER JOIN users ON users.id=paragraphs.created_user_id WHERE story_id=${request.params.storyId} ORDER BY id ASC`;
          pool
            .query(paragraphsQuery)
            .then((paragraphsQueryResult) => {
              const paragraphs = (paragraphsQueryResult.rows.length > 0)
                ? paragraphsQueryResult.rows
                : [];
              const paragraphsFmt = paragraphs.map((paragraph) => ({
                ...paragraph,
                created_username_fmt: paragraph.created_username,
              }));
              const obj = {
                ...result,
                paragraphs: paragraphsFmt,
              };
              resolve(obj);
            })
            .catch((error) => {
              reject(new Error(error.message));
            });
        }),
      )
      // render
      .then((result) => {
        const obj = { user: request.user, story: result, paragraph: result.paragraph };
        response.render('editparagraph', obj);
      })
      .catch((error) => {
        if (error.message === globals.NO_PARAGRAPH_EXISTS_ERROR_MESSAGE) {
          response.status(404).send(`Error 404: ${globals.NO_PARAGRAPH_EXISTS_ERROR_MESSAGE}`);
        } else if (globals.STORY_NOT_FOUND_ERROR_MESSAGE) {
          response.status(404).send(`Error 404: ${globals.STORY_NOT_FOUND_ERROR_MESSAGE}`);
        } else if (error.message === globals.ACCESS_CONTROL_EDIT_PARAGRAPH_ERROR_MESSAGE) {
          response.status(404).send(`Error 401: ${globals.ACCESS_CONTROL_EDIT_PARAGRAPH_ERROR_MESSAGE}`);
        } else {
          response.send(`Error: ${error.message}`);
        }
      });
  }
};

export const handlePostEditParagraph = (pool) => (request, response) => {
  let validatedParagraph = {};
  let story = {};
  let invalidRequests = [];
  if (!request.isUserLoggedIn) {
    const errorMessage = 'You have to be logged in to edit a paragraph!';
    response.render('login', { userInfo: {}, genericSuccess: {}, genericError: { message: errorMessage } });
  } else {
    const checkStoryParaQuery = `SELECT paragraphs.id, paragraphs.created_user_id, paragraphs.last_updated_user_id, paragraphs.created_at, paragraphs.last_updated_at, paragraphs.story_id, paragraphs.paragraph, stories.created_user_id AS story_creator_id FROM paragraphs INNER JOIN stories ON paragraphs.story_id = stories.id WHERE paragraphs.id=${request.params.paragraphId} AND paragraphs.story_id=${request.params.storyId}`;
    pool
      .query(checkStoryParaQuery)
      // check access control, or if paragraph exists in story
      .then((checkStoryParaResult) => {
        if (checkStoryParaResult.rows.length === 0) {
          throw new Error(globals.NO_PARAGRAPH_EXISTS_ERROR_MESSAGE);
        } else if (
          checkStoryParaResult.rows[0].created_user_id !== request.user.id
          && checkStoryParaResult.rows[0].story_creator_id !== request.user.id
        ) {
          throw new Error(globals.ACCESS_CONTROL_EDIT_PARAGRAPH_ERROR_MESSAGE);
        } else {
          story = {
            ...checkStoryParaResult.rows[0],
            paragraph: {
              paragraph: checkStoryParaResult.rows[0].paragraph,
            },
          };
          return Promise.resolve(story);
        }
      })
      // get story
      .then(
        (result) => new Promise((resolve, reject) => {
          const storyQuery = `SELECT stories.created_user_id, users.realname AS created_username, stories.title, stories.starting_paragraph_id, starting_paragraphs.paragraph AS starting_paragraph, stories.ending_paragraph_id, ending_paragraphs.paragraph AS ending_paragraph, stories.street FROM stories INNER JOIN starting_paragraphs ON stories.starting_paragraph_id = starting_paragraphs.id INNER JOIN ending_paragraphs ON stories.ending_paragraph_id = ending_paragraphs.id INNER JOIN users ON stories.created_user_id = users.id WHERE stories.id=${request.params.storyId}`;
          pool
            .query(storyQuery)
            .then((storyQueryResult) => {
              if (storyQueryResult.rows.length === 0) {
                throw new Error(globals.STORY_NOT_FOUND_ERROR_MESSAGE);
              } else {
                const createdUsernameFmt = storyQueryResult.rows[0].created_username;
                story = {
                  created_username_fmt: createdUsernameFmt,
                  ...storyQueryResult.rows[0],
                  ...result,
                  starting_paragraph: storyQueryResult.rows[0].starting_paragraph.split('{{name}}').join(storyQueryResult.rows[0].created_username).split('{{street}}').join(storyQueryResult.rows[0].street),
                  ending_paragraph: storyQueryResult.rows[0].ending_paragraph.split('{{name}}').join(storyQueryResult.rows[0].created_username).split('{{street}}').join(storyQueryResult.rows[0].street),
                };
                resolve(story);
              }
            })
            .catch((error) => {
              reject(new Error(error.message));
            });
        }),
      )
      // get keyword ids
      .then(
        (result) => new Promise((resolve, reject) => {
          const paraKeywordsQuery = `SELECT * FROM paragraphs_keywords WHERE paragraph_id=${result.id}`;
          pool
            .query(paraKeywordsQuery)
            .then((paraKeywordsResult) => {
              if (paraKeywordsResult.rows.length < 3) {
                throw new Error(globals.NO_PARAGRAPH_EXISTS_ERROR_MESSAGE);
              } else {
                story = {
                  ...result,
                  keywordIds: [
                    paraKeywordsResult.rows[0].keyword_id,
                    paraKeywordsResult.rows[1].keyword_id,
                    paraKeywordsResult.rows[2].keyword_id,
                  ],
                };
                resolve(story);
              }
            })
            .catch((error) => {
              reject(new Error(error.message));
            });
        }),
      )
      // match keyword ids with text
      .then(
        (result) => new Promise((resolve, reject) => {
          const { keywordIds } = result;
          const matchKeywordsQuery = 'SELECT * FROM keywords WHERE id=$1 OR id=$2 OR id=$3';
          pool
            .query(matchKeywordsQuery, keywordIds)
            .then((matchKeywordsResult) => {
              story = {
                ...story,
                keywords: [
                  matchKeywordsResult.rows[0].keyword,
                  matchKeywordsResult.rows[1].keyword,
                  matchKeywordsResult.rows[2].keyword,
                ],
              };
              resolve(story);
            })
            .catch((error) => {
              reject(new Error(error.message));
            });
        }),
      )
      // get all paragraphs
      .then(
        (result) => new Promise((resolve, reject) => {
          const paragraphsQuery = `SELECT paragraphs.id, paragraphs.created_user_id, users.realname AS created_username, paragraphs.last_updated_user_id, paragraphs.story_id, paragraphs.paragraph FROM paragraphs INNER JOIN users ON users.id=paragraphs.created_user_id WHERE story_id=${request.params.storyId} ORDER BY id ASC`;
          pool
            .query(paragraphsQuery)
            .then((paragraphsQueryResult) => {
              const paragraphs = (paragraphsQueryResult.rows.length > 0)
                ? paragraphsQueryResult.rows
                : [];
              const paragraphsFmt = paragraphs.map((paragraph) => ({
                ...paragraph,
                created_username_fmt: paragraph.created_username,
              }));
              story = {
                ...result,
                paragraphs: paragraphsFmt,
              };
              resolve(story);
            })
            .catch((error) => {
              reject(new Error(error.message));
            });
        }),
      )
      .then((result) => {
        const paragraph = request.body;
        validatedParagraph = validation.validateParagraph(paragraph, result.keywords);
        invalidRequests = util.getInvalidFormRequests(validatedParagraph);
        if (invalidRequests.length > 0) {
          throw new Error(globals.INVALID_NEW_PARAGRAPH_ERROR_MESSAGE);
        } else {
          const paragraphFmt = validatedParagraph.paragraph.replace(/[\r\n\v]+/g, ' ').split("'").join("''");
          const newParaQuery = `UPDATE paragraphs SET paragraph='${paragraphFmt}' WHERE id=${request.params.paragraphId} RETURNING *`;
          pool
            .query(newParaQuery)
            .then((newParaQueryResult) => {
              response.redirect(`/story/${newParaQueryResult.rows[0].story_id}`);
            })
            .catch((error) => {
              throw new Error(`${error.message}`);
            });
        }
      })
      .catch((error) => {
        if (error.message === globals.NO_PARAGRAPH_EXISTS_ERROR_MESSAGE) {
          response.status(404).send(`Error 404: ${globals.NO_PARAGRAPH_EXISTS_ERROR_MESSAGE}`);
        } else if (error.message === globals.STORY_NOT_FOUND_ERROR_MESSAGE) {
          response.status(404).send(`Error 404: ${globals.STORY_NOT_FOUND_ERROR_MESSAGE}`);
        } else if (error.message === globals.ACCESS_CONTROL_EDIT_PARAGRAPH_ERROR_MESSAGE) {
          response.status(404).send(`Error 401: ${globals.ACCESS_CONTROL_EDIT_PARAGRAPH_ERROR_MESSAGE}`);
        } else {
          let invalidReqText = '';
          if (error.message === globals.INVALID_NEW_PARAGRAPH_ERROR_MESSAGE) {
            invalidReqText = invalidRequests.map((req) => validatedParagraph[req]).join(' ');
          } else {
            invalidReqText = `Error: ${error.message}`;
          }

          const obj = {
            user: request.user,
            story,
            paragraph: { ...validatedParagraph, invalidReqText },
          };
          response.render('editparagraph', obj);
        }
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
    const nameFmt = util.setDbRealname(
      validatedUserInfo.realname.split("'").join("''"),
    );
    const { username } = validatedUserInfo;

    const usernameQuery = `SELECT * FROM users WHERE username='${username}'`;
    pool
      .query(usernameQuery)
      .then((result) => {
        if (result.rows.length > 0) {
          throw new Error(globals.USERNAME_EXISTS_ERROR_MESSAGE);
        } else {
          const values = [username, nameFmt, hashedPassword];
          const newUserQuery = 'INSERT INTO users (username, realname, password) VALUES ($1, $2, $3) RETURNING *';
          return pool.query(newUserQuery, values);
        }
      })
      .then(() => {
        const successMessage = 'You have registered successfully! Please log in.';
        response.render('login', { userInfo: {}, genericSuccess: { message: successMessage }, genericError: {} });
      })
      .catch((error) => {
        let errorMessage = '';
        if (error.message === globals.USERNAME_EXISTS_ERROR_MESSAGE) {
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
    const username = validatedLogin.username.split("'").join("''");
    const usernameQuery = `SELECT * from users WHERE username='${username}'`;

    pool
      .query(usernameQuery)
      .then((result) => {
        if (result.rows.length === 0) {
          // we didnt find a user with that email.
          // the error for password and user are the same.
          // don't tell the user which error they got for security reasons,
          // otherwise people can guess if a person is a user of a given service.
          throw new Error(globals.LOGIN_FAILED_ERROR_MESSAGE);
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
            throw new Error(globals.LOGIN_FAILED_ERROR_MESSAGE);
          } else {
            // create an unhashed cookie string based on user ID and salt
            const unhashedCookieString = `${result.rows[0].id}-${globals.SALT}`;
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
        if (error.message === globals.LOGIN_FAILED_ERROR_MESSAGE) {
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
