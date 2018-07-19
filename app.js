var createError = require('http-errors');
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var app = express();

var indexRouter = require('./routes/index');
var adminRouter = require('./routes/admin');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
// app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

// app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(''));
app.use(express.static(path.join(__dirname, 'public')));

// Routers
app.use('/', indexRouter);
app.use('/admin', function(req, res, next) {
	// check cookie to validate identity
	if(req.cookies.email != 'admin') {
    res.locals.error = {
      message: 'Whoops! Something went wrong!',
      status: '',
      stack: ''
    };
    res.render('error', {title: 'Error'});
  } else {
    next();
  }
}, adminRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  // res.locals.error = {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
