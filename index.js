import express from 'express';
import fs from 'fs';
import morgan from 'morgan';
import nunjucks from 'nunjucks';
import { loadTSV, dumpJSON } from './file-utils.js';

const app = express();

const tsv = await loadTSV('students.tsv');

const slugify = (s) => s.replace(/\s+/g, '-').replace(/[^-\w]/g, '').toLowerCase();

const classes = {};
const teachers = {};

tsv.forEach((s) => {
  const { course, period, teacher } = s;
  const teacherLast = teacher.replace(/,.*$/, '');
  const teacher_lc = teacher.toLowerCase();
  const name = `${s.course} Period ${s.period} (${teacher})`;
  const slug = slugify(`${s.course}-p-${s.period}-${teacher}`);
  if (!(slug in classes)) {
    classes[slug] = { course, period, name, teacherLast, teacher_lc, students: [] }
  }
  if (!(teacher_lc in teachers)) {
    teachers[teacher_lc] = { name: teacher, students: [] };
  }
  classes[slug].students.push(s);
  teachers[teacher_lc].students.push(s);
});

console.log(teachers);

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

app.get(['/learn/p/:slug', '/review/p/:slug'], async (req, res) => {
  const { slug } = req.params;
  const script = req.path.split('/p/')[0].slice(1);
  res.render('study.njk', { ...classes[slug], script });
});

app.get(['/learn/t/:teacher', '/review/t/:teacher'], async (req, res) => {
  const { teacher } = req.params;
  const script = req.path.split('/t/')[0].slice(1);
  res.render('study.njk', { ...teachers[teacher], script });
});

app.get(['/learn', '/review'], async (req, res) => {
  const script = req.path.slice(1);
  res.render('study.njk', { students: tsv, script });
});

const PORT = 8086;
app.listen(PORT, () => console.log(`Listening on port ${PORT}!`));
