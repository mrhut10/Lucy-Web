const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo')(session);
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
// const passport = require('passport');
// const promisify = require('es6-promisify');
const flash = require('connect-flash');
const expressValidator = require('express-validator');
// const routes = require('./routes/index');
// const helpers = require('./helpers');
const errorHandlers = require('./handlers/errorHandlers');
// const mail = require('../handlers/mail');

const userController = require('./controllers/userController');
const { catchErrors } = require('./handlers/errorHandlers');

// create our Express app
const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views')); // pug files folder
app.set('view engine', 'pug'); // we use the engine pug, mustache or EJS work great too

// public files
app.use(express.static(path.join(__dirname, 'client/dist/')));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Exposes a bunch of methods for validating data. Used heavily on userController.validateRegister
app.use(expressValidator());

// populates req.cookies with any cookies that came along with the request
app.use(cookieParser());

// Sessions allow us to store data on visitors from request to request
// This keeps users logged in and allows us to send flash messages

app.use(session({
  secret: process.env.SECRET,
  key: process.env.KEY,
  resave: false,
  saveUninitialized: false,
  store: new MongoStore({ mongooseConnection: mongoose.connection }),
}));


// The flash middleware let's us use req.flash('error', 'Shit!'),
// which will then pass that message to the next page the user requests
app.use(flash());

// pass variables to our templates + all requests
app.use((req, res, next) => {
  // res.locals.h = helpers;
  res.locals.flashes = req.flash();
  res.locals.user = req.user || null;
  res.locals.currentPath = req.path;
  res.locals.googleAnalyticsID = process.env.googleAnalyticsID;
  next();
});

app.get('/', async (req, res) => {
  res.render('main', { countDown: 300 - await userController.cachedCountDown.getCount() });
});

app.get('/reg', (req, res) => {
  res.render('register', {});
});

app.post(
  '/reg',
  userController.validateForm,
  catchErrors(userController.setToken),
);

app.get('/api/countdown', userController.countDown);

app.get('/verify/:token', catchErrors(userController.verifyEmail));

app.get('/subscription', catchErrors(userController.subscriptionChange));

// If that above routes didn't work, we 404 them and forward to error handler
app.use(errorHandlers.notFound);

// One of our error handlers will see if these errors are just validation errors
app.use(errorHandlers.flashValidationErrors);

// Otherwise this was a really bad error we didn't expect! Shoot eh
if (process.env.NODE_ENV === 'development') {
  /* Development Error Handler - Prints stack trace */
  app.use(errorHandlers.developmentErrors);
}

// production error handler
app.use(errorHandlers.productionErrors);

module.exports = app;
