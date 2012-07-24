/**
 * Module dependencies.
 */

var express = require('express');

require('express-namespace');

var app = module.exports = express.createServer();

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.set('port', 3000);

  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());

  // Use logging middleware
  //app.use(express.logger());
  //app.use(logging.requestLogger);
  
  //app.use(express.session({ secret: 'your secret here' }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  
  app.set('port', 3001);
});

app.configure('production', function(){
  app.use(express.errorHandler());
});


require('./apps/fruktkartan/routes')(app);

app.listen(app.settings.port, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});