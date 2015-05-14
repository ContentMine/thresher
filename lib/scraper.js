// # Scraper
//
// > Scraper class in the Node.js Thresher package.
// >
// > author: [Richard Smith-Unna](http://blahah/net)
// > email: <richard@contentmine.org>
// > copyright: Shuttleworth Foundation (2014)
// > license: [MIT](https://github.com/ContentMine/thresher/blob/master/LICENSE-MIT)
//
// ---
//
// ## Description
//
// Scrapers can scrape DOMs (or URLs from which DOMs can be rendered). They are
// created from ScraperJSON definitions, and return scraped data as structured
// JSON. Scraping a provided DOM is synchronous, while scraping a URL is
// asynchronous. and can be monitored by subscribing to events.
//
// Scrapers emit the following events:
// * `error`: on any error. If not intercepted, these events will throw.
// * `elementCaptured` ***(data)***: when an element is successfully captured.
// * `elementCaptureFailed` ***(element)***: when element capture fails.
// * `downloadComplete`: when a download finished.
// * `done` ***(results)***: when the entire scraping process is finished
//
// ## Usage
//
// The Scraper class is created from a ScraperJSON definition:
//
//     var scraper = new Scraper(definition);
//
// The scraper is them executed on a DOM:
//
//     scraper.scrapeDoc(doc);
//

var EventEmitter2 = require('eventemitter2').EventEmitter2
  , util = require('util')
  , file = require('./file.js')
  , Downloader = require('./download.js')
  , url = require('./url.js')
  , dom = require('./dom.js')
  , Ticker = require('./ticker.js')
  , request = require('request')
  , HeadlessRenderer = require('./renderer/headless.js')
  , BasicRenderer = require('./renderer/basic.js')
  , ElementTree = require('./elementTree.js').ElementTree;

var Scraper = function(definition, headless) {
  var scraper = this;

  EventEmitter2.call(this, {
    wildcard: true,
    maxListeners: 0
  });
  if (scraper.validate(definition)) {
    // The definition is laoded into the properties
    // of the scraper. Optional properties are set to
    // null if they are missing.
    scraper.url = definition.url;
    scraper.doi = definition.doi || null;
    scraper.name = definition.name;
    scraper.elements = definition.elements;
    scraper.followables = definition.followables || [];
    scraper.actions = definition.actions || null;

    // The renderer is chosen. Basic by default (see BasicRenderer),
    // but if the user specifies headless rendering, or if there are
    // any interactions to perform on the page, the renderer is Headless
    // (see HeadlessRenderer).
    if (headless || definition.headless || scraper.actions) {
      scraper.rendererClass = HeadlessRenderer;
      scraper.emit('info', 'using headless renderer');
    } else {
      scraper.rendererClass = BasicRenderer;
      scraper.emit('info', 'using basic renderer');
    }

    // Elements are processed into a queue. Because some elements
    // depend on following URLs specified by other elements, dependencies
    // are resolved into a tree. The scraping proceeds by starting at the
    // root of the tree and scraping all the child elements. Any with
    // dependents are then rendered and their children scraped, and so on.
    scraper.loadElements();
    scraper.tree = new ElementTree(scraper.elementsArray);
    scraper.follow_urls = {};
    scraper.results = {};

    // In order to resolve follows efficiently, we store rendered documents
    // in an object using their element name as the key. The starting URL
    // is stored with the key 'root'.
    scraper.docs = {};
  } else {
    return null;
  }

}

// Scraper inherits from EventEmitter
util.inherits(Scraper, EventEmitter2);

// Provide a new renderer
Scraper.prototype.newRenderer = function() {
  var scraper = this;
  var renderer = new scraper.rendererClass();
  renderer.on('renderer.*', function(var1, var2) {
    scraper.emit(this.event, var1, var2)
  });
  return renderer;
}

// Validate a scraperJSON definition
//
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
      // each terminal element (leaf) must have a selector
      var keywords = ['selector', 'attribute', 'download',
                      'regex', 'follow', 'name'];
      var checkLeaves = function(elements) {
        for (k in elements) {
          if (keywords.indexOf(k) > -1) {
            continue;
          }
          var e = elements[k];
          if (!(typeof e === 'object')) {
            continue;
          }
          var isLeaf = true;
          for (j in e) {
            if (keywords.indexOf(j) == -1) {
              // this element has child[ren]
              isLeaf = false;
              checkLeaves(e);
            }
          }
          if (isLeaf) {
            // this element is a leaf
            if (!e.selector) {
              problems.push('element ' + k + ' has no selector');
            }
          }
        }
      }
      checkLeaves(def.elements);
    }
  }
  if (problems.length > 0) {
    this.emit('error', new Error('invalid ScraperJSON definition: \n' +
                       problems.join('\n')));
  }
  return true;
}

// Check if this scraper applies to a given URL
Scraper.prototype.matchesURL = function(theUrl) {
  var regex = new RegExp(this.url);
  return regex.test(theUrl);
}

// Load elements from a dictionary of nested objects
// to a dictionary of nested scrapers, also
// storing all elements in a flat array for rapid iteration
Scraper.prototype.loadElements = function() {
  this.elementsArray = getChildElements(this);
}

// Flatten an element tree by recursion
// add the key of each element to the element
// as name. Include followables.
function getChildElements(obj) {
  var elementsArray = [];
  // process followables first, they
  // will be excluded from results later
  if (obj.followables) {
    for (var key in obj.followables) {
      var element = obj.followables[key];
      element.name = key;
      elementsArray.push(element);
      elementsArray.concat(getChildElements(element));
    }
  }
  if (obj.elements) {
    for (var key in obj.elements) {
      var element = obj.elements[key];
      element.name = key;
      elementsArray.push(element);
      elementsArray.concat(getChildElements(element));
    }
  }
  return elementsArray;
}

// Restore scraping results to the structure of the
// input scraper
Scraper.prototype.structureResults = function() {
  var scraper = this;
  var cleanResults = {};
  fillChildResults(scraper, scraper.elements, cleanResults);
  return cleanResults;
}

// Recursively populate a results object with scraping results,
// following the structure of the scraper element tree by
// depth-first recursion
function fillChildResults(scraper, obj, newRes) {
  var baseKeys = ['selector', 'attribute', 'download', 'regex', 'follow', 'name'];
  for (var key in obj) {
    if (baseKeys.indexOf(key) >= 0) {
      // ignore base keys
      continue;
    }
    newRes[key] = {};
    // add any result value to the element
    if (scraper.results.hasOwnProperty(key)) {
      newRes[key].value = scraper.results[key];
    }
    // continue structuring child results
    var element = obj[key];
    fillChildResults(scraper, element, newRes[key]);
  }
}

// Scrape the provided URL
// Start at the root node.
// Render the root URL and save the document in the docs object.
// Iterate through the child elements scraping them.
// For each child element, recurse.
Scraper.prototype.scrapeUrl = function(theUrl, node) {
  var scraper = this;
  scraper.startTicker();
  scraper.results = {};
  node = node || scraper.tree.root;
  var children = node.children;
  // render the base url and load the HTML into a DOM
  var renderer = scraper.newRenderer();
  renderer.render(theUrl, this.actions);
  var binidx = 0;
  this.ticker.elongate();
  renderer.on('renderer.urlRendered', function(theUrl, html) {
    scraper.emit('urlRendered', theUrl);
    // the children of the root node have no dependencies, so we scrape
    // all the elements in it from the base URL
    var doc = dom.render(html);
    scraper.docs[theUrl] = doc;
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      var hasChildren = child.children.length > 0;
      scraper.scrapeElement(doc, child.element, theUrl, null, hasChildren);
      // climb down the tree for any children with children of their own
      if (hasChildren) {
        // scrape every url for the followed element
        var nextUrls = scraper.follow_urls[child.element.name];
        for (var i; i < nextUrls.length; i++) {
          scraper.scrapeUrl(nextUrls[i], child);
        }
      }
    }
    scraper.ticker.tick();
  });
}

// Scrape a specific element
Scraper.prototype.scrapeElement = function(doc, element, scrapeUrl, key, follow_url) {
  var scraper = this;
  follow_url = typeof follow_url !== 'undefined' ? follow_url : false;
  // extract element
  key = key || element.name;
  if (follow_url) {
    this.follow_urls[key] = []
  }
  var selector = element.selector;
  var attribute = element.attribute;
  var matches = dom.select(selector, doc);
  if (!scraper.results.hasOwnProperty(key)) {
    scraper.results[key] = [];
  }
  for (var i = 0; i < matches.length; i++) {
    var res = matches[i];
    if (res) {
      res = dom.getAttribute(res, attribute);

      // run regex if applicable
      if (element.regex) {
        res = scraper.runRegex(res, element.regex)
      }

      // if the result is a URL, trim and clean it
      if (follow_url || element.download) {
        res = res.trim();
        res = url.cleanResourcePath(res, scrapeUrl);
      }

      // if the element has followers, save the url
      if (follow_url) {
        this.follow_urls[key].push(res);
      }

      // process downloads
      if (element.download) {
        scraper.downloadElement(element, res, scrapeUrl);
      }

      // save the result
      this.results[key].push(res);
      scraper.emit('elementCaptured', key, res);
    } else {
      scraper.emit('elementCaptureFailed', element);
    }
  }
  scraper.emit('elementResults', key, this.results[key]);
}

Scraper.prototype.startTicker = function() {
  var scraper = this;
  if (!scraper.ticker) {
    scraper.ticker = new Ticker(0, function() {
      var results = scraper.structureResults();
      scraper.emit('end', scraper.results, results);
    });
  }
}

// Download the resource specified by an element
Scraper.prototype.downloadElement = function(element, res, scrapeUrl) {
  var down = new Downloader();

  var scraper = this;
  // rename downloaded file?
  var rename = null;
  if (typeof element.download === 'object') {
    if (element.download.rename) {
      rename = element.download.rename;
    }
  }
  // set download running
  down.downloadResource(res, scrapeUrl, rename);
  // add it to the task ticker
  scraper.ticker.elongate();
  down.once('downloadStarted', function(url) {
    scraper.emit(this.event, url);
  });
  down.once('downloadSaved', function(path) {
    scraper.emit(this.event, path);
    scraper.ticker.tick();
    down.removeAllListeners();
  });
  down.once('*Error', function(err) {
    scraper.emit(this.event, err);
    scraper.ticker.tick();
  });
}

// Run regular expression on a captured element
Scraper.prototype.runRegex = function(string, regex) {
  var re;
  if (regex instanceof Object) {
    if (regex.flags) {
      var flags = regex.flags.join('');
      re = new RegExp(regex.source, flags);
    } else {
      re = new RegExp(regex.source);
    }
  } else {
    re = new RegExp(regex);
  }
  var match = re.exec(string);
  var matches = [];
  while (match != null) {
    var captures = match.slice(1);
    if (re.global) {
      matches = matches.concat(captures);
    } else {
      matches = captures;
      break;
    }
    match = re.exec(string);
  }
  return matches;
}

module.exports = Scraper;
