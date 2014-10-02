// TODO:
// - add domains to logging events ('debug', 'info', etc.)
// - thresher needs to output files (results.json, downloads)

require('shelljs/global');
var deps = require('./dependencies.js'),
    util = require('util'),
    EventEmitter2 = require('eventemitter2').EventEmitter2,
    _ = require('lodash'),
    underscoreDeepExtend = require('underscore-deep-extend');

_.mixin({deepExtend: underscoreDeepExtend(_)});

var file = require('./file.js')
  , Downloader = require('./download.js')
  , url = require('./url.js')
  , dom = require('./dom.js')
  , Ticker = require('./ticker.js');

// Create a new Thresher.
//
// A Thresher controls a scraping operation.
//
// Thresher handles rendering a page using the chosen rendering engine,
// passing the HTML of the rendered page back to the Node context,
// re-rendering it in the local Node jsdom, and
// running scraperJSON-defined scrapers on the rendered DOM.
//
// Thresher emits events during the scraping process:
// - 'error': if an error occurs
// - 'element': for each extracted element
// - 'result': the final result of a single scraping operation
// - 'rendered': when the HTML of the rendered DOM is returned from PhantomJS
var Thresher = function(scraperBox) {
  this.scraperBox = scraperBox;
  EventEmitter2.call(this, {
    wildcard: true,
    maxListeners: 0
  });
}

// Thresher inherits from EventEmitter
util.inherits(Thresher, EventEmitter2);

// Scrape a URL using a ScraperJSON-defined scraper.
//
// @param {String} scrapeUrl the URL to scrape
// @param {Object} definition a dictionary defining the scraper
Thresher.prototype.scrape = function(scrapeUrl, headless) {
  var thresher = this;
  thresher.emit('scrapeStart', scrapeUrl);

  // validate arguments
  url.checkUrl(scrapeUrl);

  // set up the scraper
  var scraper = thresher.scraperBox.getScraper(scrapeUrl);
  if (!scraper) {
    // maybe need to resolve the URL
    thresher.resolveScrape(scrapeUrl, headless);
    return;
  }

  if (scraper.actions) {
    headless = true;
  }

  scraper.on('*', function(var1, var2) {
    thresher.emit('scraper.' + this.event, var1 || '', var2 || '');
  });

  scraper.on('end', function(result, structured) {
    var keyscaptured = Object.keys(result).length;
    var keysexpected = scraper.elementsArray.length;
    if (keyscaptured < keysexpected) {
      // some expected elements weren't captured
      // try resolving any redirects
      thresher.emit('info', 'only ' + keyscaptured +
                    ' elements out of ' + keysexpected +
                    'were captured. Attempting URL resolve.');
      thresher.resolveScrape(scrapeUrl, headless, result);
    } else {
      thresher.emit('result', result, structured);
    }
  })

  scraper.scrapeUrl(scrapeUrl);

};

Thresher.prototype.resolveScrape = function(scrapeUrl, headless, lastResult) {
  var thresher = this;

  // follow url redirects
  url.resolveRedirects(scrapeUrl, function(err, resolvedUrl) {

    // set up the scraper
    var scraper = thresher.scraperBox.getScraper(resolvedUrl);

    if (scraper.actions) {
      headless = true;
    }

    scraper.on('*', function(var1, var2) {
      thresher.emit('scraper.' + this.event, var1, var2);
    });

    scraper.on('end', function(result, structured) {
      if (lastResult) {
        structured = _.deepExtend(lastResult, structured);
      }
      thresher.emit('result', structured);
    })

    scraper.scrapeUrl(resolvedUrl);
  });
}

Thresher.prototype.loadCookie = function(filepath) {
  var cookiejson = JSON.parse(fs.readFileSync(filepath));
  this.jar = new CookieJar();
  jar.add(cookiejson);
}

module.exports = Thresher;
