var _ = require('underscore');

var cache = {
  _cache: {},
  _updated: null,
  load: function(array, keyProperty) {
    this._cache = {};
    var keys = _.pluck(array, keyProperty);
    _.each(keys, function(item, index) {
      this._cache[item] = array[index];
    }.bind(this));
    this._updated = Date.now();
  },
  age: function() {
    return (Date.now() - this._updated) / 1000;
  },
  isEmpty: function() {
    return _.isEmpty(this._cache);
  },
  get: function(key) {
    return this._cache[key];
  },
  set: function(key, object) {
    this._cache[key] = object;
  },
  values: function() {
    return _.values(this._cache);
  }
};

module.exports = cache;