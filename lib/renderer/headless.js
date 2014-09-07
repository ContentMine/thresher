var EventEmitter = require('events').EventEmitter
  , util = require('util')
  , request = require('request');

// SpookyJS provides our bridge to CasperJS and PhantomJS
var Spooky = require('spooky');

var HeadlessRenderer = function() {};
util.inherits(HeadlessRenderer, EventEmitter);

HeadlessRenderer.prototype.render = function(url, actions, cookiejar) {
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
    renderer.emit('urlRendered', url, body);
  });

  spooky.on('404', function (msg, trace) {
    log.error(msg);
    var err = new Error(msg);
    err.stack = trace;
    this.emit('error', err);
  });

  spooky.on('resourceTimeout', function (code, string, url) {
    var err = new Error(code + ' ' + string + " - " + url);
    renderer.emit('error', err);
  });

  if (loglevel === 'debug') {
    spooky.on('console', function (line) {
      var parts = line.split(' ');
      renderer.emit('phantomLog', parts.slice(1, parts.length).join(' '));
    });

    spooky.on('log', function (log) {
      if (log.space === 'remote') {
        renderer.emit('phantomLog', log.message.replace(/ \- .*/, ''));
      }
    });
  }
}

// generate SpookyJS settings
// @param {String} loglevel the loglevel
// @return {Object} the settings
HeadlessRenderer.prototype.settings = function(loglevel) {
  env['PHANTOMJS_EXECUTABLE'] = deps.getbinpath('phantomjs');
  return {
    child: {
      command: deps.getbinpath('casperjs')
    },
    casper: {
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
