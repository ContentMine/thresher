var fs = require('fs'),
    sj = require('./scraperJSON.js'),
    events = require('events');

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
  events.EventEmitter.call(this);
  this.scrapers = [];
  if (dir) {
    var files = fs.readdirSync(dir);
    files = files.filter(function(x) {
      return new RegExp('\.json$').test(x)
    });
    for (i in files) {
      var file = files[i];
      file = dir + '/' + file;
      this.addScraper(file);
    }
  }
  if (this.scrapers.length > 0) {
    this.emit('scrapersLoaded', this.scrapers.length);
  }
}

// ScraperBox inherits from EventEmitter
ScraperBox.prototype.__proto__ = events.EventEmitter.prototype;

// Add a scraper definition from a scraperJSON file
//
// @param {Object|String} scraper scraper definition object OR path to the scraperJSON file
ScraperBox.prototype.addScraper = function(scraper) {
  if (typeof(scraper) == 'string') {
    scraper = JSON.parse(fs.readFileSync(scraper, 'utf8'));
  }
  try {
    if (sj.checkDefinition(scraper)) {
      this.scrapers.push(scraper);
      return true;
    }
  } catch (e) {
    this.emit('warn', 'could not load scraper: ' + scraper);
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
    var re = new RegExp(scraper.url);
    if (re.test(url)) {
      matches.push(scraper)
    }
  }
  if (matches.length == 0) {
    this.emit('error', 'Scraper not found for URL: ' + url);
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
