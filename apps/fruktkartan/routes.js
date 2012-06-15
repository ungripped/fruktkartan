var request = require('request'),
    jade    = require('jade'),
    fs      = require('fs'),
    ejs     = require('ejs'),
    _       = require('underscore');

var routes = function(app) {

  // TODO: articleTemplate is using the old format from the website.
  // TODO: migrate web to new mobile driven json format
  var articleTemplate = fs.readFileSync(__dirname + '/views/article.ejs', 'utf8');
  var treeTemplate    = fs.readFileSync(__dirname + '/views/tree.ejs', 'utf8');

  app.get('/', function(req, res){
    res.render('index', {
      title: 'fruktkartan.se'
    });
  });

  app.get('/image/:name', function(req, res) {
    console.log('Getting image: ' + req.params.name);

    request({
        method: 'GET',
        uri: 'http://xn--ssongsmat-v2a.nu/w/api.php',
        json: true,
        qs: {
          action: 'query',
          prop: 'imageinfo',
          titles: req.params.name,
          iiprop: 'url',
          iiurlwidth: '640',
          format: 'json'
        },
      },
      function(error, request, body) {
        
        var page = _.chain(body.query.pages).values().first().value();
        var info = page.imageinfo[0];

        res.send({
          url: info.thumburl,
          width: info.thumbwidth,
          height: info.thumbheight
        });
      }
    );
  });

  app.get('/pos', function(req, res) {
  //var url = "http://xn--ssongsmat-v2a.nu/w/api.php?action=ask&q=[[Fruktträd::%2B]]&po=Artikel|Bild|Ikontyp|Beskrivning|Koordinater&format=json";
  //gammal syntax: //var url = "http://xn--ssongsmat-v2a.nu/w/api.php?action=ask&q=%5B%5BFrukttr%C3%A4d%3A%2B%5D%5D&po=Artikel|Bild|Ikon|Ikontyp|Beskrivning|Koordinater&format=json";
    var url = "http://xn--ssongsmat-v2a.nu/w/api.php?action=ask&query=%5B%5BFrukttr%C3%A4d%3A%2B%5D%5D%7C%3FArtikel%7C%3FBild%7C%3FIkon%7C%3FIkontyp%7C%3FBeskrivning%7C%3FKoordinater%7Climit=500&format=json";
    
    request(url, function(error, response, body) {
      var resultObj = JSON.parse(body);
      //console.log(body);
      //var trees = _.pluck(resultObj.query.results, "printouts");

      var articles = _.pluck(trees, "Artikel");
      var coords = _.pluck(trees, "Koordinater");


      var trees = _.map(resultObj.query.results, function(obj, key) {
        //console.log(arguments);
        var tree = obj.printouts;
        if (tree.Artikel.length > 0) {

          return {
            Artikel: tree.Artikel[0].fulltext,
            Original: obj.fulltext,
            url: tree.Artikel[0].fullurl,
            Bild: tree.Bild.length > 0 ? tree.Bild[0].fulltext : undefined,
            Ikon: tree.Ikon[0],
            Ikontyp: tree.Ikontyp[0],
            Beskrivning: tree.Beskrivning[0],
            Koordinater: tree.Koordinater[0]
          };
        }
        else {
          return false;
        }
      });

      trees = _.filter(trees, function(tree) { return tree !== false });
      console.log(trees.length);


      res.send(trees);
    })
  });

  function uploadImage(file, name, cb) {
    fs.readFile(file.path, function (err, data) {
      if (err) cb(err, null);
      
      request({
        method: 'POST',
        uri: 'http://xn--ssongsmat-v2a.nu/w/api.php',
        headers: {
          'content-type': 'multipart/form-data'
        },
        multipart: [
          {
            'Content-Disposition': 'form-data; name="action"',
            'Content-Type': 'text/plain; charset=UTF-8',
            'Content-Transfer-Encoding': '8bit',
            'body': 'upload'
          },
          {
            'Content-Disposition': 'form-data; name="filename"',
            'Content-Type': 'text/plain; charset=UTF-8',
            'Content-Transfer-Encoding': '8bit',
            'body': file.name
          },
          {
            'Content-Disposition': 'form-data; name="text"',
            'Content-Type': 'text/plain; charset=UTF-8',
            'Content-Transfer-Encoding': '8bit',
            'body': 'Från iPhone-klient'
          },
          {
            'Content-Disposition': 'form-data; name="comment"',
            'Content-Type': 'text/plain; charset=UTF-8',
            'Content-Transfer-Encoding': '8bit',
            'body': 'Från fruktkartan.se'
          },
          {
            'Content-Disposition': 'form-data; name="token"',
            'Content-Type': 'text/plain; charset=UTF-8',
            'Content-Transfer-Encoding': '8bit',
            'body': '+\\'
          },
          {
            'Content-Disposition': 'form-data; name="format"',
            'Content-Type': 'text/plain; charset=UTF-8',
            'Content-Transfer-Encoding': '8bit',
            'body': 'json'
          },
          {
            'Content-Disposition': 'form-data; name="file"; filename="' + file.name + '"',
            'Content-Type': 'application/octet-stream; charset=UTF-8',
            'Content-Transfer-Encoding': 'binary',
            'body': data
          },
        ] 
      }, function (error, response, body) {
        if(response.statusCode == 200){
          console.log('document saved!');
          var json = JSON.parse(body);
          if (json.upload && json.upload.result == "Success") {
            cb(null, "Fil:" + json.upload.filename);
          }
          else if (json.upload && json.upload.result == "Warning" && json.upload.warnings.duplicate && json.upload.warnings.duplicate.length > 0) {
            cb(null, "Fil: " + json.upload.warnings.duplicate[0]);
          }
          else {
            console.log("UPLOAD FAILED: ");
            console.log(body);
            cb("Upload failed", null);
          }
        } 
        else {
          console.log('error: '+ response.statusCode);
          console.log(body);
          cb(error, null);
        }
      });
    });
  }

  app.post('/tree', function(req, res) {
    console.log("POST tree");
    editTree(req, res, '0');
  });

  app.put('/tree', function(req, res) {
    console.log("PUT tree");
    editTree(req, res, 'new')
  });

  //app.put('/tree', function(req, res) {
  function editTree(req, res, section) {
    console.log(req.body);
    console.log("-----------");
    console.log(req.files);

    console.log(req.body.Artikel);
    //var tree = JSON.parse(req.body);

    req.body.Bild = '';
    if (_.size(req.files) == 1) {
      console.log("Got images");
      _(req.files).each(function(file, name) {
        
        uploadImage(file, name, function(error, savedFile) {
          if (error == null) {
            req.body.Bild = savedFile;
            console.log("Before: ");
            console.log(req.body);
            addTree(req.body, function(error, tree) {
              console.log("Tree added with image, sending reply...");
              console.log("After: ");
              console.log(tree);
              if (!error) 
                res.send(tree);
              else
                res.send("Kunde inte ladda upp träd");
            });
          }
        });
      });
    }
    else {
      console.log("No images");
      addTree(req.body, function(error, tree) {
        console.log("Tree added without image, sending reply...");
        if (!error) 
          res.send(tree);
        else
          res.send("Kunde inte ladda upp träd");
      });
    }


    
  };

  function addTree(tree, cb) {
    console.log("Adding tree:");
    console.log(tree);
    var mwEdit = ejs.render(treeTemplate, {locals: tree});
    var posStr = tree.pos.lat + "," + tree.pos.lon;

    var title = tree.Original ? tree.Original : "Fruktträd:"+posStr;

    var editUrl = "http://xn--ssongsmat-v2a.nu/w/api.php";
    editData = {
      action: 'edit',
      title: title,
      summary: 'Från fruktkartan.se',
      text: mwEdit,
      token: '+\\',
      format: 'json'
    };

    console.log("Sending request");
    request({url: editUrl, form: editData, method: 'POST'}, function (e, r, body) {
      console.log("Response received:");
      console.log(body);
      var jsonRes = JSON.parse(body);
      if (r.statusCode == 200 && jsonRes["edit"]["result"] == "Success") {
        console.log("Success, callback");
        cb(null, {
            Artikel: tree.Artikel,
            Original: jsonRes["edit"]["title"],
            url: tree.url,
            Bild: tree.Bild,
            Beskrivning: tree.Beskrivning,
            Koordinater: tree.pos
        });
      }
      else {
        console.log("Error");
        cb("Kunde inte lägga till träd.", null);
      }
      /*
      var ret = {status: ""};
      if (r.statusCode == 200 && jsonRes["edit"]["result"] == "Success") {
        ret.status = "OK";
      }
      else {
        ret.status = "Error";
        ret.error = "Kunde inte lägga till träd.";
      }

      res.send(ret);
      */
    });
    console.log("Whoopsie?");
  }

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