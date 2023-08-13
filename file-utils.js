import { readFile, writeFile } from 'node:fs/promises';

/*
 * Load a local JSON file.
 */
const loadJSON = (file) => readFile(file, 'utf-8').then((text) => JSON.parse(text));

/*
 * Save data as JSON to the given file.
 */
const saveJSON = (file, data) => writeFile(file, JSON.stringify(data, null, 2), 'utf-8');

/*
 * Dump JSON to the console.
 */
const dumpJSON = (obj) => console.log(JSON.stringify(obj, null, 2));

/*
 * Load a TSV file into objects.
 */
const loadTSV = async (file, fields) => {
  const rows = await readFile(file, 'utf-8').then((text) =>
    text
      .split(/\r?\n/)
      .filter((line) => line)
      .map((line) => line.split('\t')),
  );
  const headers = fields || rows[0];
  return rows.slice(1).map((row) => Object.fromEntries(headers.map((name, i) => [name, row[i]])));
};

/*
 * Dump an array of objects as a TSV
 */
const dumpTSV = (objects) => {
  console.log(Object.keys(objects[0]).join('\t'));
  objects.forEach((o) => console.log(Object.values(o).join('\t')));
};

export { loadJSON, saveJSON, dumpJSON, loadTSV, dumpTSV };
