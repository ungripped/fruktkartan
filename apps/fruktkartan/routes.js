var request = require('request'),
    jade    = require('jade'),
    fs      = require('fs'),
    ejs     = require('ejs'),
    cache   = require('./cache'),
    bot     = require('nodemw'),
    _       = require('underscore');

var routes = function(app) {

  var cachedTrees = Object.create(cache);
  var lastCached = null;

  var client = new bot({
      server: 'xn--ssongsmat-v2a.nu',
      path: '/w',
      debug: true
  });

  var treeTemplate    = fs.readFileSync(__dirname + '/views/tree.ejs', 'utf8');

  app.get('/', function(req, res){
    res.render('index', {
      title: 'fruktkartan.se'
    });
  });

  app.get('/embed', function(req, res){
    res.render('embed', {
      title: 'fruktkartan.se'
    });
  });

  app.get('/health', function(req, res) {
    res.send({
      pid: process.pid,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    });
  });

  app.get('/image/:name', function(req, res) {
    console.log('Getting image: ' + req.params.name);

    var params = {
      action: 'query',
      prop: 'imageinfo',
      titles: req.params.name,
      iiprop: 'url',
      iiurlwidth: '640'
    };
    client.api.call(params, function(err, info, data) {
        var page = _.chain(data.query.pages).values().first().value();
        var info = page.imageinfo[0];

        res.send({
          url: info.thumburl,
          width: info.thumbwidth,
          height: info.thumbheight
        });
    });
  });

  /* Bild-url-100 och Bild-url-200 är fulhack. En sundare variant vore att bara  */
  function getTrees(coordinates, cb) {
    console.log("Getting trees for coordinates: " + coordinates);
    var params = {
        action: 'ask',
        query: '[[Kategori:Fruktträd]]|?Artikel|?Bild|?Bild-url-100|?Bild-url-150|?Bild-url-200|?Ikon|?Ikontyp|?Beskrivning|?Koordinater|limit=2950'
    };
    console.log('Fetching trees');
    //var url = "http://säsongsmat.nu/w/api.php?action=ask&query=[[Kategori%3AFrukttr%C3%A4d]]|%3FArtikel|%3FBild|%3FBild-url-100|%3FBild-url-150|%3FBild-url-200|%3FIkon|%3FIkontyp|%3FBeskrivning|%3FKoordinater|limit%3D1950&format=json";
    client.api.call(params, function(err, info, next, data) {
        if (err) {
            console.log('ERROR: ', err);
            return cb(null);
        }

        var trees = _.map(data.query.results, function(obj, key) {
          //console.log(arguments);
          var tree = obj.printouts;
          if (tree.Artikel.length > 0) {

            var beskrivning = tree.Beskrivning[0] ? tree.Beskrivning[0].replace(/(<([^>]+)>)/ig,"") : "";
            return {
              Artikel: tree.Artikel[0].fulltext,
              Original: obj.fulltext,
              url: tree.Artikel[0].fullurl,
              Bild: tree.Bild.length > 0 ? tree.Bild[0].fulltext : undefined,
              BildUrl200: tree["Bild-url-200"].length > 0 ? tree["Bild-url-200"] : undefined,
              BildUrl150: tree["Bild-url-150"].length > 0 ? tree["Bild-url-150"] : undefined,
              BildUrl100: tree["Bild-url-100"].length > 0 ? tree["Bild-url-100"] : undefined,
              Ikon: tree.Ikon[0],
              Ikontyp: tree.Ikontyp[0],
              Beskrivning: beskrivning,
              Koordinater: tree.Koordinater[0],
              TradUrl: obj["fullurl"],
              TradArtikel: obj["fulltext"]
            };
          }
          else {
              return false;
          }
      });

      trees = _.filter(trees, function(tree) { return tree !== false });
      console.log("Number of trees: " + trees.length);

      cb(trees);
    });
  }

  app.get('/reloadCache', function(req, res) {
    console.log("Refreshing cache");
    getTrees(undefined, function(trees) {
      cachedTrees.load(trees, "Original");
      res.send("Cached refreshed");
    })
  });

  function handlePosRequest(req, res) {
    var isCached = !cachedTrees.isEmpty();

    // Turn off cache timeout for now.
    if (!isCached) { // || cachedTrees.age() > 3600) { // one hour cache
      console.log("Cache timeout, updating...");
      getTrees(req.params.coordinates, function(trees) {
        cachedTrees.load(trees, "Original");
        if (!isCached) {
          res.send(trees);
        }
      });
    }

    if (isCached) {
      res.send(cachedTrees.values());
    }
  }

  app.get('/pos/:coordinates', function(req, res) {
    console.log(req.connection.remoteAddress + " - " + (new Date()).toString() + " [" + req["headers"]["user-agent"] + ": API call: getting trees (with coordinates, from app)");

    handlePosRequest(req, res);
  });

  app.get('/pos', function(req, res) {
    console.log(req.connection.remoteAddress + " - " + (new Date()).toString() + " [" + req["headers"]["user-agent"] + ": API call: getting trees");

    handlePosRequest(req, res);
  });

/*
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
            cb(null, json.upload.filename);
          }
          else if (json.upload && json.upload.result == "Warning" && json.upload.warnings.duplicate && json.upload.warnings.duplicate.length > 0) {
            cb(null, json.upload.warnings.duplicate[0]);
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

*/

  app.post('/tree', function(req, res) {
    console.log("POST tree");
    editTree(req, res, '0');
  });

  app.put('/tree', function(req, res) {
    console.log("PUT tree");
    editTree(req, res, 'new')
  });



  function uploadImage(file, name, cb) {
    fs.readFile(file.path, function (err, data) {
        if (err) cb(err, null);
        client.upload(file.name, data, "Från fruktkartan.se.", function(err, response) {
            if (err) {
                console.log("Upload failed: " + err);
                return cb(err, null);
            }
            else {
                console.log("Image uploaded");
                console.log(response);
                return cb(null, response.title);
            }
        });
    });
  }

  function editTree(req, res, section) {
    console.log(req.body);
    console.log("-----------");
    console.log(req.files);

    console.log(req.body.Artikel);

    client.logIn(app.get('mw_username'), app.get('mw_password'), function(err, obj) {
        if (err != null) {
            return cb('Kunde inte logga in.', null);
        }

        req.body.Bild = '';
        if (req.files && _.size(req.files) == 1) {
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
                  if (!error) {
                    if (tree.Bild.substring(0, 4) != "Fil:")
                      tree.Bild = "Fil:" + tree.Bild;
                    res.send(tree);
                  }
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
            if (!error) {
              res.send(tree);
            }
            else
              res.send("Kunde inte ladda upp träd");
          });
        }
    });



  };

  function addTree(tree, cb) {
    console.log("Adding tree:");
    console.log(tree);

    var mwEdit = ejs.render(treeTemplate, {locals: tree});
    var posStr = tree.pos.lat + "," + tree.pos.lon;
    var title = tree.Original ? tree.Original : "Fruktträd:"+posStr;

    client.edit(title, mwEdit, 'Från fruktkartan.se', function(err, edit) {
        if (err != null) {
            return cb('Kunde inte lägga till träd.', null);
        }

        var treeObject = {
            Artikel: tree.Artikel,
            Original: edit["title"],
            TradUrl: "http://säsongsmat.nu/ssm/" + edit["title"],
            url: tree.url,
            Bild: tree.Bild,
            BildUrl: tree.BildUrl,
            Beskrivning: tree.Beskrivning.replace(/(<([^>]+)>)/ig,""),
            Koordinater: tree.pos
        };

        cachedTrees.set(treeObject.Original, treeObject);
        cb(null, treeObject);
    });
  }
};

module.exports = routes;
