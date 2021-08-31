import jsSHA from 'jssha';

// GLOBAL CONSTANTS
const { SALT } = process.env;

export const getHash = (input) => {
  // create new SHA object
  // eslint-disable-next-line new-cap
  const shaObj = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });

  // create an unhashed cookie string based on user ID and salt
  const unhashedString = `${input}-${SALT}`;

  // generate a hashed cookie string using SHA object
  shaObj.update(unhashedString);

  return shaObj.getHash('HEX');
};

export const getRandomIds = (arr, count) => {
  const idArr = [];
  for (let i = 0; (i < count || arr.length > 0); i += 1) {
    const randomIndex = Math.floor(Math.random() * arr.length);
    const retrievedId = arr.splice(randomIndex, 1)[0].id;
    idArr.push(retrievedId);
  }
  if (count === 1) {
    return idArr[0];
  }
  return idArr;
};

export const getInvalidFormRequests = (obj) => Object.keys(obj).filter((key) => key.indexOf('invalid') >= 0);

export const setDbUsername = (username) => username.toLowerCase().split(' ').join('_');