function AddViewModel(options) {
  var self           = this;

  self.fruits        = ko.observableArray(['Äpple', 'Päron', 'Plommon', 'Körsbär', 'Annan sort']);
  self.selectedFruit = ko.observable("");
  self.customFruit   = ko.observable("");
  self.description   = ko.observable("");

  self.map          = options.map;
  self.el           = $(options.element)[0];
  self.markerImages = options.markerImages;

  self.saving       = ko.observable(false);

  self.infoWindow   = new InfoBubble({
    map: self.map,
    content: self.el,
    arrowStyle: 0,
    arrowSize: 10,
    backgroundClassName: 'info-bg',
    backgroundColor: '#e9e9e9',
    minWidth: 310, maxWidth: 310,
    minHeight: 150, maxHeight: 250
  });

  google.maps.event.addListener(self.infoWindow, 'closeclick', function(event) {
    self.marker.setMap(null);
  });

  self.selectedFruit.subscribe(function(newValue) {
    newValue = newValue ? newValue : "Annan sort";
    if (self.marker) {
      var markerImage = self.markerImages[newValue];
      self.marker.setIcon(markerImage);
    }
  });

  self.open = function() {
    if (self.marker != undefined) 
      self.close();

    var pos         = self.map.getCenter();
    var markerImage = self.markerImages["Annan sort"];
    
    self.marker     = new google.maps.Marker({
      position:   pos, 
      map:        self.map, 
      icon:       markerImage,
      draggable:  true
    });

    self.infoWindow.open(self.map, self.marker);

    $('.info-bg').parent().addClass("infowindow");
  }

  self.reset = function() {
    self.selectedFruit(undefined);
    self.customFruit("");
    self.description("");

    self.marker = undefined;
  }

  self.close = function() {
    self.infoWindow.close();
    self.marker.setMap(null);
  
    self.reset();
  }

  // TODO: Don't show error messages as alerts!
  self.validate = function() {
    if (self.selectedFruit() == undefined) {
      alert("Du måste välja en fruksort.");
      return false;
    }
    if (self.selectedFruit() == "Annan sort" && self.customFruit() == "") {
      alert("Du måste ange vilken sort det är på trädet.");
      return false;
    }
    return true;
  }


  self.save = function() {
    if (!self.validate()) return;

    self.saving(true);
    var pos = self.marker.getPosition();

    var tree = {
      Artikel: self.selectedFruit() != "Annan sort" ? self.selectedFruit() : self.customFruit(),
      Beskrivning: self.description().replace(/(<([^>]+)>)/ig,""),
      pos: {
        lat: pos.lat(),
        lon: pos.lng()
      }
    };


    $.ajax({
      url: '/tree',
      type: 'PUT',
      dataType: 'json',
      contentType: 'application/json',
      processData: false,
      data: JSON.stringify(tree),
      error: function(jqXHR, textStatus, errorThrown) {
        alert("Kunde inte lägga till träd: " + textStatus);
        self.saving(false);
      },
      success: function(responseData, textStatus) {
        self.close();
        self.saving(false);
        FK.page.add_tree(responseData);
      }

    })
  }

  ko.applyBindings(self, self.el);
}

function InfoViewModel(options) {
  var self          = this;

  self.url          = ko.observable("");
  self.editUrl      = ko.observable("");
  self.deleteUrl    = ko.observable("");
  self.article      = ko.observable("");
  self.description  = ko.observable("");

  self.map          = options.map;
  self.el           = $(options.element)[0];

  self.urlPattern = urlPattern = /\[((http|ftp|https):\/\/[\w-]+(\.[\w-]+)+([\w.,@?^=%&amp;:\/~+#-]*[\w@?^=%&amp;\/~+#-])?) (.+)\]/;


  self.infoWindow   = new InfoBubble({
    map: self.map,
    content: self.el,
    arrowStyle: 0,
    arrowSize: 10,
    backgroundClassName: 'info-bg',
    backgroundColor: '#e9e9e9',
    minWidth: 300, maxWidth: 300,
    minHeight: 150, maxHeight: 150
  });

  self.open = function(obj) {
    self.url(obj.data.url);
    self.article(obj.data.Artikel);


    if (obj.data.Beskrivning) {
      self.description(obj.data.Beskrivning.replace(self.urlPattern, '<a href="$1">$5</a>'));
    }
    else {
      self.description("");
    }

    self.editUrl(obj.data.TradUrl + "?action=formedit");
    self.deleteUrl(obj.data.TradUrl + "?action=delete");
    self.infoWindow.open(self.map, obj.marker);

    if (self.map.getZoom() < 15) {
      self.map.setCenter(obj.marker.getPosition());
      self.map.setZoom(15);
    }

    $('.info-bg').parent().addClass("infowindow");

    window.location.hash = obj.data.TradArtikel;
  }

  self.close = function() {
    self.infoWindow.close();
    window.location.hash = "";
  }

  ko.applyBindings(self, self.el);
}

function PageViewModel(treeName) {
  var self          = this;

  self.map          = undefined;
  self.markerImages = undefined;

  self.treeName = treeName;

  self.trees        = ko.observableArray([]);

  self.totalTrees   = ko.computed(function() { return self.trees().length });
  
  self.showingInfo  = ko.observable(false);

  self.init = function() {
    var stockholm = new google.maps.LatLng(59.326359,18.07371);

    var mapOptions = {
      zoom: 12,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    self.map = new google.maps.Map($('#fruktkarta')[0], mapOptions);
  
    self.map.setCenter(stockholm);

    var anchorPoint = new google.maps.Point(15, 45);
    var size        = new google.maps.Size(30, 45);
    var origin      = new google.maps.Point(0, 0);
  
    self.markerImages = {
      "Äpple": new google.maps.MarkerImage('//static.sasongsmat.nu/fruktkartan/images/markers/marker-apple.png', size, origin, anchorPoint),
      "Päron": new google.maps.MarkerImage('//static.sasongsmat.nu/fruktkartan/images/markers/marker-pear.png', size, origin, anchorPoint),
      "Plommon": new google.maps.MarkerImage('//static.sasongsmat.nu/fruktkartan/images/markers/marker-plum.png', size, origin, anchorPoint),
      "Körsbär": new google.maps.MarkerImage('//static.sasongsmat.nu/fruktkartan/images/markers/marker-cherries.png', size, origin, anchorPoint),
      "Annan sort": new google.maps.MarkerImage('//static.sasongsmat.nu/fruktkartan/images/markers/marker-empty.png', size, origin, anchorPoint)
    };

    self.set_position();
    self.load_trees();

    self.infoViewModel = new InfoViewModel({map: self.map, element: '#info_window'});
    self.addViewModel  = new AddViewModel({map: self.map, element: '#add_window', markerImages: self.markerImages});

    /*
    var treePath = document.location.pathname.split('/');
    if(treePath.length >= 3) {
      treePath = treePath[2];
    }
    else {
      treePath = undefined;
    }
    */
  }

  self.set_position = function() {
    if(navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        var loc = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
        self.map.setCenter(loc);
      });
    } 
    else if (google.gears) {
      var geo = google.gears.factory.create('beta.geolocation');
      geo.getCurrentPosition(function(position) {
        var loc = new google.maps.LatLng(position.latitude,position.longitude);
        self.map.setCenter(loc);
      });
    } 
  }

  self.add_tree = function(tree) {
    var p = new google.maps.LatLng(tree.Koordinater.lat, tree.Koordinater.lon);
    var markerImage = self.markerImages[tree.Artikel];
    if (!markerImage)
      markerImage = self.markerImages["Annan sort"];

    var marker = new google.maps.Marker({position: p, map: self.map, icon: markerImage});

    /*
      if (treePath) {
        var title = tree.title.mTextform;
        if(title == decodeURI(treePath)) {
          $("#info_window").infoWindow('showData', {marker: marker, data: tree});
        }
      }
      */

    google.maps.event.addListener(marker, 'click', function(e) {
      self.infoViewModel.open({marker: marker, data: tree});
    });

    if (tree.TradArtikel == self.treeName) {
      setTimeout(function() {
        self.infoViewModel.open({marker: marker, data:tree});
      }, 300);
    }
  }

  self.load_trees = function() {
    $.getJSON('/pos', function(data) {

      self.trees(data);
      
      $.each(data, function(index, tree) {
        if (!tree) return;
        if (!tree.Koordinater) return;

        self.add_tree(tree);
      });
    });
  }

  self.toggleInfo = function() {
    self.showingInfo(!self.showingInfo());
  }

  self.addTree = function() {
    self.addViewModel.open();
  }

  self.init();
}

$(document).ready(function() {
  window.FK = {};
  var treeName = "";
  if (window.location.hash.length > 2) {
    treeName = decodeURI(window.location.hash.substring(1)); 
  }
  FK.page = new PageViewModel(treeName);
  ko.applyBindings(FK.page, $('#app')[0]);
});
