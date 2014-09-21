var request = require('request').defaults({ jar: true }),
    progress = require('request-progress'),
    fs = require('fs'),
    url = require('./url.js'),
    nodeurl = require('url'),
    path = require('path'),
    util = require('util'),
    EventEmitter2 = require('eventemitter2').EventEmitter2;

var Downloader = function() {
  EventEmitter2.call(this, {
    wildcard: true,
    maxListeners: 0
  });
}

// Downloader inherits from EventEmitter
util.inherits(Downloader, EventEmitter2)

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
  var req = request(config);
  dl.downloadWithProgress(req, name);
}

Downloader.prototype.downloadWithProgress = function(req, filename) {
  console.log('downloading:', filename);
  var dl = this;
  var p = progress(req);

  p.on('progress', function (state) {
    dl.emit('downloadProgress', filename, state);
  });
  p.on('error', function (err) {
    dl.emit('downloadError', err, filename);
  });

  var pipe = p.pipe(fs.createWriteStream(filename));

  pipe.on('error', function (err) {
    dl.emit('fileSaveError', err, filename);
  });
  pipe.on('close', function (err) {
    console.log(filename);
    dl.emit('downloadSaved', filename);
  });
}

module.exports = Downloader;
