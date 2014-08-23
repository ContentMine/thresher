var events = require('events');
var file = require('./file.js')
  , Downloader = require('./download.js')
  , url = require('./url.js')
  , dom = require('./dom.js')
  , Ticker = require('./ticker.js')
  , request = require('request');

var Scraper = function(scraper) {
  events.EventEmitter.call(this);
  if (this.validate(scraper)) {
    this.url = scraper.url;
    this.doi = scraper.doi || null;
    this.name = scraper.name;
    this.elements = scraper.elements;
    this.followOns = scraper.followOns || [];
  } else {
    return null;
  }
}

// Scraper inherits from EventEmitter
Scraper.prototype.__proto__ = events.EventEmitter.prototype;

// validate a scraperJSON definition
Scraper.prototype.validate = function(def){
  var problems = [];
  // url key must exist
  if (!def.url) {
    problems.push('must have "url" key');
  }
  // elements key must exist
  if(!def.elements) {
    problems.push('must have "elements" key');
  } else {
    // there must be at least 1 element
    if (Object.keys(def.elements).length == 0) {
      problems.push('no elements were defined');
    } else {
      // each element much have a selector
      var elements = def.elements;
      for (k in elements) {
        var e = elements[k];
        if (!e.selector) {
          problems.push('element ' + k + ' has no selector');
        }
      }
    }
  }
  if (problems.length > 0) {
    this.emit('error', new Error('invalid ScraperJSON definition: \n' +
                       problems.join('\n')));
  }
  return true;
}

// check if this scraper applies to a given URL
Scraper.prototype.matchesURL = function(url) {
  var regex = new RegExp(this.url);
  return regex.test(url);
}

// Annotate any elements that are depended on
// as follow-ons by other elements by setting
// their 'followme' property to true
Scraper.prototype.annotateFollows = function() {
  follows = [];
  for (var i in this.elementsArray) {
    var element = this.elementsArray[i];
    if (element.hasOwnProperty('follow')) {
      follows.push(element.follow);
    }
  }
  for (var i in this.elementsArray) {
    var element = this.elementsArray[i];
    if (follows.indexOf(element.key) > -1) {
      element.followme = true;
    }
  }
}

// TODO: maybe a better approach is to have a function
// that handles an object, checking if it's an element,
// and recursing if it has child elements

// Load elements from a dictionary of nested objects
// to a dictionary of nested scrapers, also
// storing all elements in a flat array for rapid iteration
Scraper.prototype.loadElements = function() {
  this.elementsArray = getChildElements(this);
}

function getChildElements(obj) {
  var elementsArray = [];
  if (obj.elements) {
    for (var key in obj.elements) {
      var element = obj.elements[key];
      element.key = key;
      elementsArray.push(element);
      elementsArray.concat(getChildElements(element));
    }
  }
  return elementsArray;
}

// Scrape the provided doc with this scraper
// and return the results object
Scraper.prototype.scrapeDoc = function(doc) {
  this.doc = doc;
  this.results = this.scrape();
  this.doc = null;
  return this.results;
}

Scraper.prototype.scrape = function() {
  process.setMaxListeners(0);
  this.startTicker();
  this.results = [];
  for (var key in this.elements) {
    var element = this.elements[key];
    this.scrapeElement(element, key);
  }
  return this.results
}

Scraper.prototype.startTicker = function() {
  if (!this.ticker) {
    this.ticker = new Ticker(0, function() {
      this.emit('end');
    });
  }
}

// Scrape a specific element
Scraper.prototype.scrapeElement = function(element, key) {
  var scraper = this;
  // extract element
  var selector = element.selector;
  var attribute = element.attribute;
  var matches = dom.select(selector, this.doc);
  for (var i = 0; i < matches.length; i++) {
    var res = matches[i];
    if (res) {
      res = dom.getAttribute(res, attribute);

      // run regex if applicable
      if (element.regex) {
        res = scraper.runRegex(res, element.regex)
      }

      // save the result
      var data = {};
      data[key] = res;
      scraper.emit('elementCaptured', data);
      this.results.push(data);

      // process downloads
      if (element.download) {
        scraper.downloadElement(element, res, scrapeUrl);
      }
    } else {
      scraper.emit('elementCaptureFailed', element);
    }
  }
}

// Download the resource specified by an element
Scraper.prototype.downloadElement = function(element, res, scrapeUrl) {
  if (!this.down) {
    this.down = new Downloader();
  }
  var scraper = this;
  // rename downloaded file?
  var rename = null;
  if (typeof element.download === 'object') {
    if (element.download.rename) {
      rename = element.download.rename;
    }
  }
  // set download running
  this.down.downloadResource(res, scrapeUrl, rename);
  // add it to the task ticker
  scraper.ticker.elongate();
  this.down.on('downloadComplete', function() {
    scraper.emit('downloadCompleted', res);
    scraper.ticker.tick();
  });
  this.down.on('error', function(err) {
    scraper.emit('downloadError', err);
    scraper.ticker.tick();
  });
}

// Run regular expression on a captured element
Scraper.prototype.runRegex = function(string, regex) {
  var re = new RegExp(regex);
  var match = re.exec(string);
  var matches = [];
  while (match != null) {
    var captures = match.slice(1);
    if (re.global) {
      matches.push(captures);
    } else {
      matches = captures;
      break;
    }
    match = re.exec(string);
  }
  return matches;
}

// Create a new Scraper with this url and the elements provided
// return the new scraper
Scraper.prototype.makeSubScraper = function(elements) {
  var sub = new Scraper({
    url: this.url,
    elements: elements
  });
  return sub;
}

module.exports = Scraper;
