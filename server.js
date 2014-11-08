/**
 * Module dependencies.
 */

var express = require('express');
//require('express-namespace');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var cookieParser = require('cookie-parser');
var errorHandler = require('errorhandler');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.set('port', 3000);

app.use(bodyParser.json());
app.use(methodOverride());
app.use(cookieParser());

app.use(express.static(__dirname + '/public'));

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
