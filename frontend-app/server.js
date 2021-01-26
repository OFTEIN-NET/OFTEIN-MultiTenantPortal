'use strict';

require('dotenv').config();

const path = require('path');
const express = require('express');
const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const LinkedinStrategy = require('passport-linkedin-oauth2').OAuth2Strategy;
const {FACEBOOK_CLIENT_ID, FACEBOOK_CLIENT_SECRET, SESSION_SECRET} = process.env;
const {LINKEDIN_API_KEY, LINKEDIN_SECRET_KEY} = process.env;
const {GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET} = process.env;
const port = process.env.PORT || 8000;
const app = express();
const routes = require('./routes');

passport.use(new FacebookStrategy({
        clientID: FACEBOOK_CLIENT_ID,
        clientSecret: FACEBOOK_CLIENT_SECRET,
        callbackURL: 'https://ofteinplusplus.main.202.28.193.102.xip.io/auth/facebook/callback'
    },
    (accessToken, refreshToken, profile, cb) => {
        return cb(null, profile);
    }));

passport.use(new LinkedinStrategy({
        clientID: LINKEDIN_API_KEY,
        clientSecret: LINKEDIN_SECRET_KEY,
        callbackURL: 'https://ofteinplusplus.main.202.28.193.102.xip.io/auth/linkedin/callback',
        scope: ['r_emailaddress', 'r_liteprofile'],
        state: true
    },
    (accessToken, refreshToken, profile, cb) => {
        return cb(null, profile);
    }));

passport.use(new GoogleStrategy({
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: 'https://ofteinplusplus.main.202.28.193.102.xip.io/auth/google/callback'
    },
    (accessToken, refreshToken, profile, cb) => {
        return cb(null, profile);
    }));

passport.serializeUser((user, cb) => {
    cb(null, user);
});

passport.deserializeUser((obj, cb) => {
    cb(null, obj);
});

app.set('view engine', 'ejs');

app.use('/public', express.static(path.join(__dirname, 'public')));

app.use(require('express-session')({secret: SESSION_SECRET, resave: true, saveUninitialized: true}));

app.use(passport.initialize());
app.use(passport.session());
app.use('/', routes);


app.listen(port);
