/**
 * Module dependencies.
 */

var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var cookieParser = require('cookie-parser');
var errorHandler = require('errorhandler');
var fs = require('fs');

var app = express();

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'jade');
app.set('port', 3000);

app.use(bodyParser.json());
app.use(methodOverride());
app.use(cookieParser());

var auth = JSON.parse(fs.readFileSync('auth.json', 'utf8'));

app.set('mw_username', auth['mw_username']);
app.set('mw_password', auth['mw_password']);

app.use(express.static(path.join(__dirname, 'public')))

if ('development' == app.get('env')) {
  app.use(errorHandler({ dumpExceptions: true, showStack: true }));
  app.set('port', 3001);
}

if ('production' == app.get('env')) {
  app.use(errorHandler());
}

require('./apps/fruktkartan/routes')(app);

var server = app.listen(app.settings.port, function(){
  console.log("Express server listening on port %d in %s mode", server.address().port, app.settings.env);
});
