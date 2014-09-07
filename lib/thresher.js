require('shelljs/global');
var deps = require('./dependencies.js'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter;

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
}

// Thresher inherits from EventEmitter
util.inherits(Thresher, EventEmitter);

// Scrape a URL using a ScraperJSON-defined scraper.
//
// @param {String} scrapeUrl the URL to scrape
// @param {Object} definition a dictionary defining the scraper
Thresher.prototype.scrape = function(scrapeUrl, headless) {
  var thresher = this;
  thresher.emit('scrapeStart', scrapeUrl);

  // validate arguments
  url.checkUrl(scrapeUrl);

  // follow url redirects
  url.resolveRedirects(scrapeUrl, function(err, resolvedUrl) {

    // set up the scraper
    var scraper = thresher.scraperBox.getScraper(resolvedUrl);
    if (scraper.actions) {
      headless = true;
    }
    scraper.on('end', function(result, structured) {
      thresher.emit('result', structured);
    })

    scraper.scrapeUrl(resolvedUrl);
  });

};

Thresher.prototype.loadCookie = function(filepath) {
  var cookiejson = JSON.parse(fs.readFileSync(filepath));
  this.jar = new CookieJar();
  jar.add(cookiejson);
}

module.exports = Thresher;
