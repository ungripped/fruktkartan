var request = require('request'),
    jade    = require('jade'),
    fs      = require('fs'),
    ejs     = require('ejs'),
    _       = require('underscore');

var routes = function(app) {

  var articleTemplate = fs.readFileSync(__dirname + '/views/article.ejs', 'utf8');

  app.get('/', function(req, res){
    res.render('index', {
      title: 'fruktkartan.se'
    });
  });


  app.get('/pos', function(req, res) {
  //var url = "http://xn--ssongsmat-v2a.nu/w/api.php?action=ask&q=[[Fruktträd::%2B]]&po=Artikel|Bild|Ikontyp|Beskrivning|Koordinater&format=json";
  //gammal syntax: //var url = "http://xn--ssongsmat-v2a.nu/w/api.php?action=ask&q=%5B%5BFrukttr%C3%A4d%3A%2B%5D%5D&po=Artikel|Bild|Ikon|Ikontyp|Beskrivning|Koordinater&format=json";
    var url = "http://xn--ssongsmat-v2a.nu/w/api.php?action=ask&query=%5B%5BFrukttr%C3%A4d%3A%2B%5D%5D%7C%3FArtikel%7C%3FBild%7C%3FIkon%7C%3FIkontyp%7C%3FBeskrivning%7C%3FKoordinater%7Climit=500&format=json";
    
    request(url, function(error, response, body) {
      var resultObj = JSON.parse(body);
      console.log(body);
      var trees = _.pluck(resultObj.query.results, "printouts");

      var articles = _.pluck(trees, "Artikel");
      var coords = _.pluck(trees, "Koordinater");


      trees = _.map(trees, function(tree, key) {

        if (tree.Artikel.length > 0) {

          return {
            Artikel: tree.Artikel[0].fulltext,
            url: tree.Artikel[0].fullurl,
            Bild: tree.Bild[0],
            Ikon: tree.Ikon[0],
            Ikontyp: tree.Ikontyp[0],
            Beskrivning: tree.Beskrivning[0],
            Koordinater: tree.Koordinater[0]
          };
        }
      });

      console.log(trees.length);


      res.send(trees);
    })
  });

  app.post('/pos/add', function(req, res) {
    var pos = JSON.parse(req.body.pos);
    
    var mwEdit = ejs.render(articleTemplate, {locals: pos});

    console.log(mwEdit);
    var posStr = pos.info_pos.lat + "," + pos.info_pos.lng;
    
    var editUrl = "http://xn--ssongsmat-v2a.nu/w/api.php";
    //var editData = encodeURI("action=edit&title=Fruktträd:"+ posStr +"&summary=Från fruktkartan.se&section=new&text="+mwEdit)+"&token=%2B%5C";
    //var editData = encodeURI("action=edit&title=Säsongsmat:Fruktträd/Lista&summary=Från fruktkartan.se&section=new&text="+rendered)+"&token=%2B%5C";
    editData = {
      action: 'edit',
      title: 'Fruktträd:'+posStr,
      summary: 'Från fruktkartan.se',
      section: 'new',
      text: mwEdit,
      token: '+\\',
      format: 'json'
    };
    console.log(editData);

    //req.pipe(request.post())

    request({url: editUrl, form: editData, method: 'POST'}, function (e, r, body) {
      var jsonRes = JSON.parse(body);
      var ret = {status: ""};
      if (r.statusCode == 200 && jsonRes["edit"]["result"] == "Success") {
        ret.status = "OK";
      }
      else {
        ret.status = "Error";
        ret.error = "Kunde inte lägga till träd.";
      }

      res.send(ret);
    });
    //request.post({url: editUrl, body: editData}).pipe(res);
  });
};

module.exports = routes;