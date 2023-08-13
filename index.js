import express from 'express';
import fs from 'fs';
import morgan from 'morgan';
import nunjucks from 'nunjucks';
import { loadTSV, dumpJSON } from './file-utils.js';

const app = express();

const tsv = await loadTSV('students.tsv');

const classes = {};
tsv.forEach((s) => {
  const key = `${s.course} - Period ${s.period}`;
  if (!(key in classes)) {
    classes[key] = [];
  }
  classes[key].push(s);
});

app.set('json spaces', 2);

const env = nunjucks.configure('views', {
  autoescape: true,
  express: app,
});

app.use(express.json());
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', async (req, res) => {
  res.render('index.njk', { classes });
});

app.get(['/learn/p/:p', '/review/p/:p'], async (req, res) => {
  const { p } = req.params;
  const which = req.path.split('/p/')[0].slice(1);
  const students = tsv.filter((r) => r.period === p);
  console.log(`Period: ${p}; Script: ${which}`);
  res.render('study.njk', { students: students, period: p, script: which });
});

app.get(['/learn', '/review'], async (req, res) => {
  const which = req.path.slice(1);
  res.render('study.njk', { students: tsv, script: which });
});

const PORT = 8086;
app.listen(PORT, () => console.log(`Listening on port ${PORT}!`));
