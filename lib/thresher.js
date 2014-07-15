require('shelljs/global');
var deps = require('./dependencies.js'),
    events = require('events');

// SpookyJS provides our bridge to CasperJS and PhantomJS
var Spooky = require('spooky');

var file = require('./file.js')
  , dl = require('./download.js')
  , url = require('./url.js')
  , dom = require('./dom.js')
  , Ticker = require('./ticker.js');

// Create a new Thresher.
//
// A Thresher controlls a scraping operation.
//
// Thresher handles rendering a page using PhantomJS, transferring
// the HTML of the rendered page back to the Node context,
// re-rendering it in the local Node jsdom, and
// running scraperJSON-defined scrapers on the rendered DOM.
//
// Thresher emits events during the scraping process:
// - 'error': if an error occurs
// - 'element': for each extracted element
// - 'result': the final result of a single scraping operation
// - 'rendered': when the HTML of the rendered DOM is returned from PhantomJS
var Thresher = function() {
  events.EventEmitter.call(this);
}

// Thresher inherits from EventEmitter
Thresher.prototype.__proto__ = events.EventEmitter.prototype;

// Bubble SpookyJS errors up to our interface,
// providing a clear context message and the SpookyJS message
// as detail.
//
// @param {String} err the SpookyJS error.
var handleInitError = function(err) {
  if (err) {
    var e = new Error('Failed to initialize SpookyJS');
    e.details = err;
    log.error(e);
    log.debug(e.stack);
    throw e;
  }
};

// generate SpookyJS settings
// @param {String} loglevel the loglevel
// @return {Object} the settings
var settings = function(loglevel) {
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
        }
      },
      pageSettings: {
        loadImages: false,
        loadPlugins: false
      },
      resourceTimeout: 20000,
      onResourceTimeout: function(e) {
        emit('resourceTimeout', e.errorCode, e.errorString, e.url);
        casper.exit(1);
      },
      onLoadError: function(msg, trace) {
        emit('loadError', msg, trace);
        casper.exit(1);
      }
    }
  };
}

// Scrape a URL using a ScraperJSON-defined scraper.
//
// @param {String} scrapeUrl the URL to scrape
// @param {Object} definition a dictionary defining the scraper
Thresher.prototype.scrape = function(scrapeUrl, definition) {
  log.debug('function scrape: ' + scrapeUrl);
  var loglevel = 'debug'; // delete this and move away from logging to events
  // validate arguments
  url.checkUrl(scrapeUrl);

  this.emit('scrapeStart');
  var thresher = this;

  // let's get our scrape on
  log.debug('creating spooky instance');
  var spooky = new Spooky(settings(loglevel), function() {
    log.debug('spooky initialising');
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

  spooky.on('pageDownload', function(html) {
    thresher.emit('pageRendered', html);
    log.debug('page downloaded and rendered');
    try {
      var results = thresher.scrapeHtml(html, definition, scrapeUrl);
      thresher.emit('scrapeResults', results);
    } catch(e) {
      log.error('problem scraping html:');
      log.error(e.message);
      log.error(e.stack);
    }
  });

  spooky.on('404', function (msg, trace) {
    console.log(msg);
    var err = new Error(msg);
    err.stack = trace;
    throw err;
  });

  spooky.on('resourceTimeout', function (code, string, url) {
    console.log(code);
    var err = new Error(code + ' ' + string + " - " + url);
    throw err;
  });

  if (loglevel === 'debug') {
    spooky.on('console', function (line) {
      var parts = line.split(' ');
      log.debug(parts.slice(1, parts.length).join(' '));
    });

    spooky.on('log', function (log) {
      if (log.space === 'remote') {
        console.log(log.message.replace(/ \- .*/, ''));
      }
    });
  }

};

// Parse the rendered HTML using the scraper definition.
// Downloadable resources are saved to disk, and the successfully
// parsed elements are output as JSON.
//
// @param {String} html the HTML source of the rendered page
// @param {Object} definition the scraper definition
// @param (String) scrapeUrl the URL being scraped
Thresher.prototype.scrapeHtml = function(html, definition, scrapeUrl) {
  var thresher = this;

  // check rendered HTML
  if (!html) {
    log.error('error: SpookyJS failed to render the HTML');
  }

  thresher.ticker = new Ticker(2, function(){ thresher.emit('end'); });

  // save the rendered html
  log.debug('saving rendered HTML');
  file.write('rendered.html', html, function(){ thresher.ticker.tick() });

  // load HTML into DOM
  log.debug('scraping rendered DOM');
  var doc = dom.render(html);

  // scrape the DOM using the ScraperJSON scraper
  var results = this.scrapeScraperJSON(definition,
                                         doc,
                                         scrapeUrl);
  this.emit('scrapeHtmlResults', results);
  // save results JSON
  var json = JSON.stringify(results, undefined, 2);
  file.write('results.json', json, function(){
    thresher.ticker.tick();
  });
  return results;
}

Thresher.prototype.scrapeScraperJSON =
  function(definition, doc, scrapeUrl) {
  var thresher = this;
  if (!thresher.ticker) {
    thresher.ticker = new Ticker(0, function(){ thresher.emit('end'); });
  }
  var results = [];

  // we don't know how many downloads will be spawned by each
  // element, so remove the Node.js cap of 10 listeners per
  // emitter (0 == infinty)
  process.setMaxListeners(0);

  for (var key in definition) {
    try {
      var element = definition[key];
      log.debug('scraping element:', key);
      // extract element
      var selector = element.selector;
      var attribute = element.attribute;
      var matches = dom.select(selector, doc);
      console.log("found", matches.length, "matches");
      for (var i = 0; i < matches.length; i++) {
        var res = matches[i];
        if (res) {
          res = dom.getAttribute(res, attribute);
          console.log(key + ":", dom.cleanElement(res));

          // save the result
          var data = {};
          data[key] = res;
          console.log(data);
          thresher.emit('elementCaptured', data);
          results.push(data);

          // process downloads
          if (element.download) {
            thresher.downloadElement(element, res, scrapeUrl);
          }
        } else {
          thresher.emit('elementCaptureFailed', element);
        }
      }
    } catch(err) {
      // errors deep in the stack should be presented, but
      // we want to continue with the rest of the execution
      thresher.emit('error', err);
    }
  }
  thresher.emit('scrapeScraperJSONResults', results);
  if (results.length == 0) {
    log.warn('no elements were extracted from url:', scrapeUrl);
  }
  if (thresher.ticker.length > 2) {
    log.info('waiting for',
             thresher.ticker.length - 2,
             'downloads to complete in background');
  }
  return results;
}

Thresher.prototype.downloadElement = function(element, res, scrapeUrl) {
  var thresher = this;
  // rename downloaded file?
  var rename = null;
  if (typeof element.download === 'object') {
    if (element.download.rename) {
      rename = element.download.rename;
    }
  }
  // set download running
  var down = dl.downloadResource(res, scrapeUrl, rename);
  // add it to the task ticker
  thresher.ticker.elongate();
  down.on('close', function() {
    console.log('download done');
    thresher.emit('downloadCompleted', res);
    thresher.ticker.tick();
  });
  down.on('error', function(err) {
    thresher.emit('downloadError', err);
    console.log('file download failed: ' + err);
    thresher.ticker.tick();
  });
}

module.exports = Thresher;
