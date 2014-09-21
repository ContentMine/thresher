var EventEmitter2 = require('eventemitter2').EventEmitter2
  , deps = require('../dependencies.js')
  , util = require('util')
  , request = require('request');

// SpookyJS provides our bridge to CasperJS and PhantomJS
var Spooky = require('spooky');

var HeadlessRenderer = function() {
  EventEmitter2.call(this, {
    wildcard: true,
    maxListeners: 0
  });
};
util.inherits(HeadlessRenderer, EventEmitter2);

HeadlessRenderer.prototype.render = function(scrapeUrl, actions, cookiejar) {
  var renderer = this;
  var settings = renderer.settings('debug');
  var spooky = new Spooky(settings, function() {
    spooky.start(scrapeUrl);
    spooky.then(function() {
      // in SpookyJS scope
      this.emit('pageDownload', this.evaluate(function() {
        // in rendered page scope
        return document.documentElement.outerHTML;
      }));
    });

    spooky.run();
  });

  spooky.on('pageDownload', function(body) {
    renderer.emit('renderer.urlRendered', scrapeUrl, body);
  });

  spooky.on('404', function (msg, trace) {
    var err = new Error(msg);
    err.stack = trace;
    renderer.emit('renderer.error', err);
  });

  spooky.on('resourceTimeout', function (code, string, url) {
    var err = new Error(code + ' ' + string + " - " + url);
    renderer.emit('renderer.error', err);
  });

  spooky.on('console', function (line) {
    console.log(line);
    var parts = line.split(' ');
    renderer.emit('renderer.phantomLog', parts.slice(1, parts.length).join(' '));
  });

  spooky.on('log', function (log) {
    if (log.space === 'remote') {
      renderer.emit('renderer.phantomLog', log.message.replace(/ \- .*/, ''));
    }
  });

  spooky.on('error', function (err) {
    renderer.emit('renderer.error', err)
  });
}

// generate SpookyJS settings
// @param {String} loglevel the loglevel
// @return {Object} the settings
HeadlessRenderer.prototype.settings = function(loglevel) {
  env['PHANTOMJS_EXECUTABLE'] = deps.getbinpath('phantomjs');
  return {
    child: {
      command: deps.getbinpath('casperjs'),
      'cookies-file': 'cookies.txt'
    },
    casper: {
      userAgent: 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)',
      logLevel: loglevel,
      verbose: true,
      exitOnError: true,
      httpStatusHandlers: {
        404: function(resource) {
          emit('error', resource.status + ': ' + resource.url);
          casper.exit(4);
        }
      },
      pageSettings: {
        loadImages: false,
        loadPlugins: false
      },
      resourceTimeout: 20000,
      onResourceTimeout: function(e) {
        emit('resourceTimeout', e.errorCode, e.errorString, e.url);
        casper.exit(2);
      },
      onLoadError: function(msg, trace) {
        emit('log', { space: 'remote', message: msg + trace });
        emit('loadError', msg, trace);
        casper.exit(3);
      }
    }
  };
}

module.exports = HeadlessRenderer;
