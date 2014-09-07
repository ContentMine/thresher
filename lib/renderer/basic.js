var EventEmitter = require('events').EventEmitter
  , util = require('util')
  , request = require('request');

var BasicRenderer = function() {};
util.inherits(BasicRenderer, EventEmitter);

BasicRenderer.prototype.render = function(url, actions, cookiejar) {
  var renderer = this;
  var conf = {url: url};
  if (cookiejar) {
    conf.jar = cookiejar;
  }
  request(conf, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      renderer.emit('urlRendered', url, body);
    } else if (error) {
      this.emit('error', error);
    }
  });
}

module.exports = BasicRenderer;
