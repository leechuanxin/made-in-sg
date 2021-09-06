import { readFile, writeFile } from 'fs';

const inputfilename = '../txt/sg_streets.txt';
const outputfilename = '../json/sg_streets.json';

const arrayifyContent = (content) => content.split('\n').join('\t').split('\t').filter((el) => el !== '');
const getAllStreets = (arr) => arr.filter((el) => el !== 'SG' && Number.isNaN(Number(el)));
const getUniqueItems = (arr) => {
  const result = [];
  arr.forEach((item) => {
    if (result.indexOf(item) < 0) {
      result.push(item);
    }
  });
  return result;
};

const handleFileRead = (readErr, content) => {
  // Log original file content
  // console.log(content);

  // Catch reading error if any
  if (readErr) {
    console.log('reading error', readErr);
  }

  // Process content
  const arr = arrayifyContent(content);
  const allStreetsArr = getAllStreets(arr);
  const uniqueStreetsArr = getUniqueItems(allStreetsArr);
  const obj = JSON.stringify({
    streetNames: uniqueStreetsArr,
  });

  // Write processed content back to the file, replacing old content
  writeFile(outputfilename, obj, (writeErr) => {
    // Catch writing error if any
    if (writeErr) {
      console.log('error writing', obj, writeErr);
      return;
    }
    console.log('success!');
  });
};

readFile(inputfilename, 'utf-8', handleFileRead);
