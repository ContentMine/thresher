var fs = require('fs'),
    Scraper = require('./scraper.js'),
    util = require('util'),
    EventEmitter2 = require('eventemitter2').EventEmitter2;

// Create a new ScraperSet.
//
// A ScraperBox is a container for scraperJSON
// scrapers.
//
// ScraperBox handles loading a directory of scrapers
// and selecting the matching scraper for a given URL
//
// @param {String} dir directory containing scraperJSON definitions
var ScraperBox = function(dir) {

  EventEmitter2.call(this, {
    wildcard: true,
    maxListeners: 0
  });

  this.scrapers = [];
  if (dir) {
    var files = fs.readdirSync(dir);
    files = files.filter(function(x) {
      return /\.json$/.test(x)
    });
    for (i in files) {
      var file = files[i];
      file = dir + '/' + file;
      this.addScraper(file);
    }
  }
  if (this.scrapers.length > 0) {
    this.emit('scrapersLoaded', this.scrapers.length);
  } else {
    this.emit('noScrapersFound');
  }

}

// ScraperBox inherits from EventEmitter
util.inherits(ScraperBox, EventEmitter2);

// Add a scraper definition from a scraperJSON file
//
// @param {Object|String} scraper scraper definition object OR path to the scraperJSON file
ScraperBox.prototype.addScraper = function(def) {
  if (typeof(def) == 'string') {
    def = JSON.parse(fs.readFileSync(def, 'utf8'));
  }
  var scraper = new Scraper(def);
  if (scraper.valid) {
    this.scrapers.push(scraper);
    return true;
  } else {
    return false;
  }
}

// Get the scraper whose `url` field matches the provided URL
// and return it.
//
// If no matching scrapers are found, return null.
//
// If multiple matching scrapers are found, return
// the one with the most specific match.
//
// If multiple scrapers are found with equally specific
// matches, return the one that was added to the ScraperSet
// first.
//
// @param {String} url the URL
ScraperBox.prototype.getScraper = function(url) {
  this.emit('gettingScraper', url);
  var matches = [];
  for (i in this.scrapers) {
    var scraper = this.scrapers[i];
    if (scraper.matchesURL(url)) {
      matches.push(scraper);
    }
  }
  if (matches.length == 0) {
    this.emit('scraperNotFound', url);
    return null;
  } else if (matches.length == 1) {
    this.emit('scraperFound');
    return matches[0];
  }
  this.emit('scraperFound');
  matches = matches.sort(compareRegexSpecificity);
  return matches[0];
}

// Compare two definitions a and b to decide which has the more
// specific regex. Specificity is defined as the number of non-
// wildcard characters in the regex.
//
// If a is more specific return 1
// If b is more specific return -1
// If a and b have equal specificity return 0
var compareRegexSpecificity = function(a, b) {
  var aSpec = (a.url.match(/[a-z0-9]/gi)||[]).length;
  var bSpec = (b.url.match(/[a-z0-9]/gi)||[]).length;
  if (aSpec > bSpec) {
    return -1;
  } else if (aSpec < bSpec) {
    return 1;
  }
  return 0;
}

module.exports = ScraperBox;
