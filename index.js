import express from 'express';
import fs from 'fs';
import morgan from 'morgan';
import nunjucks from 'nunjucks';
import { loadTSV, dumpJSON } from './file-utils.js';

const app = express();

const tsv = await loadTSV("students.tsv");

const classes = {};
tsv.forEach(s => {
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
  res.render('index.njk', {classes});
});

app.get('/period/:p', async (req, res) => {
  const { p } = req.params;
  res.render('study.njk', { students: tsv.filter(r => r.period === p), period: p });
});

app.get('/all', async (req, res) => {
  res.render('study.njk', { students: tsv });
});



const PORT = 8086;
app.listen(PORT, () => console.log(`Listening on port ${PORT}!`));
