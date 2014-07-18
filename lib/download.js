var request = require('request'),
    fs = require('fs'),
    url = require('./url.js'),
    nodeurl = require('url'),
    path = require('path'),
    EventEmitter = require('events').EventEmitter;

var dl = module.exports;

// Download a resource to disk. If the URL is relative,
// it will be converted to an absolute URL first using the
// page URL.
// @param {String} resUrl the URL of the resource to download
// @param {String} pageUrl the URL of the page on which the link occured
// @return {EventEmitter} an event emitter
dl.downloadResource = function(resUrl, pageUrl, rename, cookiejar) {
  var emitter = new EventEmitter();
  if (!resUrl || !pageUrl) {
    emitter.emit('error', new Error('downloadResource was passed a NULL URL'));
  }
  resUrl = url.cleanResourcePath(resUrl, pageUrl);
  if (resUrl && !/^(f|ht)tps?:\/\//i.test(resUrl)) {
    // relative URL
    resUrl = url.relativeToAbsolute(resUrl, pageUrl);
  }
  emitter.emit('downloadStarted', resUrl);
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
  request(config, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      emitter.emit('dataReceived', body);
      fs.writeFile(name, body, function(err) {
        if (err) {
          emitter.emit('error', err);
        } else {
          emitter.emit('downloadComplete', name);
        }
      });
    } else if (err) {
      emitter.emit('error', err);
    } else {
      emitter.emit('error', new Error('bad HTTP response code: ' + response.statuscode));
    }
  });
  return emitter;
}
