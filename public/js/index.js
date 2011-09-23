$.fn.serializeObject = function()
{
    var o = {};
    var a = this.serializeArray();
    $.each(a, function() {
        if (o[this.name] !== undefined) {
            if (!o[this.name].push) {
                o[this.name] = [o[this.name]];
            }
            o[this.name].push(this.value || '');
        } else {
            o[this.name] = this.value || '';
        }
    });
    return o;
};

function ParseDMS(input) {
    var parts = input.split(/[^\d\w]+/);
    var lat = ConvertDMSToDD(parts[0], parts[1], parts[2], parts[3]);
    var lng = ConvertDMSToDD(parts[4], parts[5], parts[6], parts[7]);	

	return {lat: lat, lng: lng};
}

function ConvertDMSToDD(days, minutes, seconds, direction) {
    var dd = parseInt(days) + parseInt(minutes)/60 + parseInt(seconds)/(60*60);

    if (direction == "S" || direction == "W" || direction == "V") {
        dd = dd * -1;
    } // Don't do anything for N or E
    return dd;
}

MapStateAdding = false;
function ToggleMapState() {
	MapStateAdding = !MapStateAdding;
	$('#AddTreeControl').toggleClass('selected');
	$("#fruktkarta > div").toggleClass('map_state_adding');
	$("#fruktkarta").toggleClass("map_state_adding");
}

function AddTreeControl(div) {
	div = $(div).attr({id: 'AddTreeControl'});
	this.element = div[0];
	
	var button = $('<div>Lägg till träd</div>').appendTo(div);

	var control = this;

	div.click(function() {
		ToggleMapState();
	});
}


function init_map() {
	var initialLocation;
	var stockholm = new google.maps.LatLng(59.326359,18.07371);
	var browserSupportFlag =  new Boolean();

	var myOptions = {
		zoom: 12,
		mapTypeId: google.maps.MapTypeId.ROADMAP
	};

	var map = new google.maps.Map(document.getElementById('fruktkarta'), myOptions);
	
	map.setCenter(stockholm);

	var addTreeControl = new AddTreeControl($('<div/>'));
	map.controls[google.maps.ControlPosition.TOP_LEFT].push(addTreeControl.element);

	return map;
}

function set_position(map) {
	if(navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(function(position) {
			loc = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
			map.setCenter(loc);
		});
	} 
	else if (google.gears) {
		var geo = google.gears.factory.create('beta.geolocation');
		geo.getCurrentPosition(function(position) {
			loc = new google.maps.LatLng(position.latitude,position.longitude);
			map.setCenter(loc);
		});
	} 
}

(function($) {
	var settings = {};
	var currentMarker;
	
	var clearMarker = function() {
		if (currentMarker) {
			currentMarker.setMap(null);
			currentMarker = undefined;
		}
	}
	
	var toggleForm = function() {
		$('#indicator').toggle();
		$('#info_save').toggle();
		$('#cancel_link').toggle();
	}
		
	var methods = {
		
		init: function(options) {
			$.extend(settings, options);
			
			var $this = this;
			
			this.children('form').submit(function(evt) {
				var pos = settings.iw.getPosition();
				var fObj = $(evt.target).serializeObject();
				fObj.info_pos = {
					lat: pos.lat(),
					lng: pos.lng()
				};
				toggleForm();
				$.post('pos/add', 'pos='+encodeURI(JSON.stringify(fObj)), function(res) {
					toggleForm();
					if (currentMarker) {
						// todo: fix
						var markerImage;
						if (fObj.info_type.toLowerCase()=='äpple') markerImage = markerImages['Grönt träd'];
						else if (fObj.info_type.toLowerCase()=='päron') markerImage = markerImages['Gult träd'];
						else markerImage = markerImages['Lila träd'];
						
						currentMarker.setIcon(markerImage);
						
						var m = currentMarker;
						google.maps.event.addListener(m, 'click', function(e) {
							$($this).infoWindow('showData', {marker: m, data: fObj});
						});
					}
					settings.iw.close();
					currentMarker = undefined;
				}, 'json');

				return false;
			});
			
			/*
			this.find('#edit_link').click(function(evt) {
				$($this).infoWindow('showForm', $('.info_view > h3 > a').text(), $('.info_view > p').text());
				return false;
			});
			*/
			
			google.maps.event.addListener(settings.map, 'click', function(event) {
				if (!MapStateAdding) return;
				
				if (currentMarker) {
					currentMarker.setMap(null);
				}
				var location = event.latLng;
				var marker = new google.maps.Marker({
					position: location, 
					map: settings.map
				});
				
				currentMarker = marker;
				$($this).infoWindow('openWindow', {marker: marker, val: ''});
				ToggleMapState();
			});
			google.maps.event.addListener(settings.iw, 'closeclick', function(event) {
				clearMarker();
			});
			
			
			this.find('#cancel_link').click(function(event) {
				clearMarker();
				settings.iw.close();
				return false;
			});
			
			var extraInput = this.find('#info_extra');
			
			this.find('#info_type').change(function(event) {
				if ($(this).val() == "annat") {
					extraInput.show();
				}
				else {
					extraInput.hide();
				}
			});
		},
		showForm: function(type, desc) {
			this.show();
			this.children('form').show();
			this.children('div').hide();
			
			$('#info_type').val(type.toLowerCase());
			$('#info_desc').val(desc);
			
			$('#info_extra').val('').hide();
		},
		openWindow: function(obj) {
			settings.iw.open(settings.map, obj.marker)
			settings.iw.setPosition(obj.marker.getPosition());
			
			$(this).infoWindow('showForm', obj.val);
		},
		showData: function(obj) {
			var d = obj.data.properties;
			var marker = obj.marker;
			
			settings.iw.open(settings.map, marker);
			settings.iw.setPosition(marker.getPosition());
			
			
			if (settings.map.getZoom() < 15) {
				settings.map.setCenter(marker.getPosition());
				settings.map.setZoom(15);
			}
			
			if (currentMarker) {
				currentMarker.setMap(null);
				currentMarker = undefined;
			}
			
			var w = $('#info_window');
			
			w.show();
			w.children('form').hide();
			
			var div = w.children('div').show();
			div.find('h3 > a').text(d.artikel).attr('href', 'http://xn--ssongsmat-v2a.nu/ssm/'+d.artikel)
			div.children('p').text(d.beskrivning);
		}
	};
	
	$.fn.infoWindow = function(method) {
		if (methods[method]) {
			return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
		}
		else if ( typeof method === 'object' || ! method ) {
			return methods.init.apply( this, arguments );
		}
	};
})(jQuery);

$(document).ready(function() {
	
	var treePath = document.location.pathname.split('/');
	if(treePath.length >= 3) {
		treePath = treePath[2];
	}
	else {
		treePath = undefined;
	}
		
	// TODO: refactor this, don't make them global.
	anchorPoint = new google.maps.Point(15, 30);
	size = new google.maps.Size(30, 34);
	origin = new google.maps.Point(0, 0);
	
	markerImages = {};

	markerImages = {
		"Grönt träd": new google.maps.MarkerImage('/images/Tradikon_gron.png', size, origin, anchorPoint),
		"Lila träd": new google.maps.MarkerImage('/images/Tradikon_lila.png', size, origin,  anchorPoint),
		"Gult träd": new google.maps.MarkerImage('/images/Tradikon_gul.png', size, origin,  anchorPoint)
	};
	
	var infoWindow = new google.maps.InfoWindow({
		content: $("#info_window")[0]
	});
	
	var map = init_map();
	
	setTimeout(function() {set_position(map);}, 0);
	
	$("#info_window").infoWindow({iw: infoWindow, map: map, markerImages: markerImages});
	

	$.getJSON('/pos', function(data) {
		$.each(data, function(index, tree) {
			if (tree.properties &&  tree.properties['koordinater']) {
				var convertedPos = ParseDMS(tree.properties.koordinater);
				var p = new google.maps.LatLng(convertedPos.lat, convertedPos.lng);
				var markerImage = markerImages[tree.properties.ikontyp];
			
				var marker = new google.maps.Marker({position: p, map: map, icon: markerImage});
				if (treePath) {
					var title = tree.title.mTextform;
					if(title == decodeURI(treePath)) {
						$("#info_window").infoWindow('showData', {marker: marker, data: tree});
					}
				}
			
				google.maps.event.addListener(marker, 'click', function(e) {
					$("#info_window").infoWindow('showData', {marker: marker, data: tree});
				});
			}
		});
	});
});