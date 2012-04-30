/**
* Module dependencies.
*/

var express = require('express');
var app = module.exports = express.createServer();

var httpclient = require('./httpclient');
var ejs = require('ejs');
var fs = require('fs');

// Configuration

app.configure(function(){
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(app.router);
	app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
	app.use(express.errorHandler()); 
});

// Routes

app.get('/', function(req, res){
	res.render('index', {
		title: 'fruktkartan.se'
	});
});

app.get('/tree/:name', function(req, res) {
	res.render('index', {
		title: 'fruktkartan.se'
	});
});

app.get('/tr%C3%A4d/:name', function(req, res) {
	res.render('index', {
		title: 'fruktkartan.se'
	});
});

app.get('/pos', function(req, res) {
	//var url = "http://xn--ssongsmat-v2a.nu/w/api.php?action=ask&q=[[Fruktträd::%2B]]&po=Artikel|Bild|Ikontyp|Beskrivning|Koordinater&format=json";
	//gammal syntax: //var url = "http://xn--ssongsmat-v2a.nu/w/api.php?action=ask&q=%5B%5BFrukttr%C3%A4d%3A%2B%5D%5D&po=Artikel|Bild|Ikon|Ikontyp|Beskrivning|Koordinater&format=json";
	var url = "http://xn--ssongsmat-v2a.nu/w/api.php?action=ask&query=%5B%5BFrukttr%C3%A4d%3A%2B%5D%5D%7C%3FArtikel%7C%3FBild%7C%3FIkon%7C%3FIkontyp%7C%3FBeskrivning%7C%3FKoordinater&format=json";
var client = new httpclient.httpclient();	

	client.perform(url, "GET", function(result) {
		var resultObj = JSON.parse(result.response.body);
		res.send(resultObj.ask.results.items);
	}, null);
});

app.post('/pos/add', function(req, res) {
	var pos = JSON.parse(req.body.pos);
	
	var file = fs.readFileSync(__dirname + '/views/article.ejs', 'utf8');
	var rendered = ejs.render(file, {locals: pos});
	var posStr = pos.info_pos.lat + "," + pos.info_pos.lng;
	
	var editUrl = "http://xn--ssongsmat-v2a.nu/w/api.php";
	var editData = encodeURI("action=edit&title=Fruktträd:"+ posStr +"&summary=Från fruktkartan.se&section=new&text="+rendered)+"&token=%2B%5C";
	//var editData = encodeURI("action=edit&title=Säsongsmat:Fruktträd/Lista&summary=Från fruktkartan.se&section=new&text="+rendered)+"&token=%2B%5C";
	console.log(editData);
	var client = new httpclient.httpclient();
	
	client.perform(editUrl, "POST", function(result) {
		res.send(pos); // todo: check api status for a correct response...
	}, editData);
});

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
