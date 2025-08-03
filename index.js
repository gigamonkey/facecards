import crypto from 'node:crypto';
import express from 'express';
import fs from 'fs';
import google from './google-oauth.js';
import morgan from 'morgan';
import nunjucks from 'nunjucks';
import passport from 'passport';
import { loadTSV, dumpJSON } from './file-utils.js';
import session from 'express-session';

const app = express();
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
}));
app.use(morgan('dev'));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.set('json spaces', 2);

passport.use(google);

passport.serializeUser((user, done) => {
  const { id } = user.google;
  users[id] = user;
  done(null, id);
});

passport.deserializeUser((id, done) => {
  done(null, users[id]);
});


const tsv = await loadTSV('students.tsv');

const classes = {};
const teachers = {};
const emails = {};
const users = {};

const slugify = (s) => s.replace(/\s+/g, '-').replace(/[^-\w]/g, '').toLowerCase();

tsv.forEach((s) => {
  const { course, period, teacherName, teacherEmail } = s;
  const teacherLast = teacherName.replace(/,.*$/, '');
  const teacher = teacherEmail.replace(/@.*$/, '').toLowerCase();
  emails[teacherEmail.toLowerCase()] = true;
  const name = `${s.course} Period ${s.period} (${teacher})`;
  const slug = slugify(`${s.course}-p-${s.period}-${teacher}`);
  if (!(slug in classes)) {
    classes[slug] = { course, period, name, teacherLast, teacher, students: [] }
  }
  if (!(teacher in teachers)) {
    teachers[teacher] = { name: teacher, students: [] };
  }
  classes[slug].students.push(s);
  teachers[teacher].students.push(s);
});

const requireLogin = (req, res, next) => {
  if (!req.user) {
    res.redirect(`/login?from=${encodeURIComponent(req.originalUrl)}`);
  } else {
    if (req.user.google.email.toLowerCase() in emails) {
      next();
    } else {
      res.sendStatus(403);
    }
  }
};

const env = nunjucks.configure('views', {
  autoescape: true,
  express: app,
});


app.get('/', requireLogin, async (req, res) => {
  res.render('index.njk', { classes });
});

app.get('/hello', requireLogin, (req, res) => {
  res.send('hello');
});

app.get(['/learn/p/:slug', '/review/p/:slug'], requireLogin, async (req, res) => {
  const { slug } = req.params;
  const script = req.path.split('/p/')[0].slice(1);
  res.render('study.njk', { ...classes[slug], script });
});

app.get(['/learn/t/:teacher', '/review/t/:teacher'], requireLogin, async (req, res) => {
  const { teacher } = req.params;
  const script = req.path.split('/t/')[0].slice(1);
  res.render('study.njk', { ...teachers[teacher], script });
});

app.get(['/learn', '/review'], requireLogin, async (req, res) => {
  const script = req.path.slice(1);
  res.render('study.njk', { students: tsv, script });
});

app.get('/login', (req, res) => {
  req.session.returnTo = req.originalUrl;

  const passport = req.session.passport;

  console.log('passport');
  console.log(passport);
  console.log('user');
  console.log(req.user);

  if (!passport?.user) {
    console.log(`Authenticating with google`);
    res.redirect('/auth/google');
  } else {
    console.log(`Fully authenticated going back to ${req.query.from}`);
    req.session.userId = passport.user;
    delete req.session.returnTo;
    res.redirect(decodeURIComponent(req.query.from));
  }
});

app.get('/auth/google', (req, res, next) => {
  const state = encodeURIComponent(
    JSON.stringify({
      nonce: crypto.randomBytes(16).toString('hex'),
      returnTo: req.session.returnTo,
    }),
  );

  passport.authenticate('google', {
    scope: [ 'profile', 'email'],
    state,
  })(req, res, next);
});

app.get('/auth/google/callback', (req, res, next) => {
  const { state } = req.query;
  const returnTo = state ? JSON.parse(decodeURIComponent(state)).returnTo : '/';

  passport.authenticate('google', {
    failureRedirect: '/fail',
    successReturnToOrRedirect: returnTo,
  })(req, res, next);
});

app.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy();
    res.redirect('/');
  });
});

const server = app.listen(process.env.PORT, 'localhost', (error) => {
  if (error) {
    throw error;
  }
  const { address, port } = server.address();
  console.log(`App is listening on port ${server.address().port}`);
  console.log(`http://${address}:${port}/`);
});
