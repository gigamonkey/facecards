import 'dotenv/config';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

const google = new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_REDIRECT_URL,
    passReqToCallback: true,
  },
  (req, accessToken, refreshToken, profile, done) => {
    if (!profile._json.hd.endsWith('berkeley.net')) {
      return done(null, false, { message: 'Invalid hosted domain' });
    }
    const google = {
      id: profile.id,
      name: profile.displayName,
      email: profile.emails[0].value,
      accessToken,
      refreshToken,
    };
    done(null, Object.assign({}, req.session.passport?.user, { google }));
  },
);

export default google;
