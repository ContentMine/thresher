var request = require('request'),
    fs = require('fs'),
    url = require('./url.js'),
    nodeurl = require('url'),
    path = require('path'),
    events = require('events');

var Downloader = function() {
  events.EventEmitter.call(this);
}

// Downloader inherits from EventEmitter
Downloader.prototype.__proto__ = events.EventEmitter.prototype;

// Download a resource to disk. If the URL is relative,
// it will be converted to an absolute URL first using the
// page URL.
// @param {String} resUrl the URL of the resource to download
// @param {String} pageUrl the URL of the page on which the link occured
// @return {EventEmitter} an event emitter
Downloader.prototype.downloadResource = function(resUrl, pageUrl, rename, cookiejar) {
  var dl = this;
  if (!resUrl || !pageUrl) {
    dl.emit('error', new Error('downloadResource was passed a NULL URL'));
  }
  resUrl = url.cleanResourcePath(resUrl, pageUrl);
  if (resUrl && !/^(f|ht)tps?:\/\//i.test(resUrl)) {
    // relative URL
    resUrl = url.relativeToAbsolute(resUrl, pageUrl);
  }
  dl.emit('downloadStarted', resUrl);
  // renaming the file?
  var name = rename;
  if (!rename) {
    var pathname = nodeurl.parse(resUrl).pathname;
    name = path.basename(pathname);
  }
  var config = {
    url: resUrl
  }
  if (cookiejar) {
    config.jar = cookiejar;
  }
  request(config, function (err, response, body) {
    if (!err && response.statusCode == 200) {
      dl.emit('dataReceived', body);
      fs.writeFile(name, body, function(err) {
        if (err) {
          dl.emit('error', err);
        } else {
          dl.emit('downloadComplete', name);
        }
      });
    } else if (err) {
      dl.emit('error', err);
    } else {
      dl.emit('error', new Error('bad HTTP response code: ' +
      response.statusCode));
    }
  });
}

module.exports = Downloader;
