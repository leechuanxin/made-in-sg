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

export const getInvalidFormRequests = (obj) => Object.keys(obj).filter((key) => key.indexOf('invalid') >= 0);
