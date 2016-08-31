var EventEmitter = require('events').EventEmitter
  , util = require('util')
  , request = require('request').defaults({ jar: true });

var BasicRenderer = function() {};
util.inherits(BasicRenderer, EventEmitter);

BasicRenderer.prototype.render = function(url, actions, cookiejar) {
  var renderer = this;
  var conf = {url: url, timeout: 10000};
  if (cookiejar) {
    conf.jar = cookiejar;
  }
  request(conf, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      renderer.emit('renderer.urlRendered', url, body);
    }
    else if (error) {
      renderer.emit('renderer.error', error)
    }
    else {
      renderer.emit('renderer.error', 'page did not return a 200 instead returned '+response.statusCode);
    }
  });
}

module.exports = BasicRenderer;
