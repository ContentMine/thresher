var events = require('events');

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

// check if this scraper applies to a URL
Scraper.prototype.matchesURL = function(url) {
  var regex = new RegExp(this.url);
  return regex.test(url);
}

module.exports = Scraper;
