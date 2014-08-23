var Scraper = require('../lib/scraper.js'),
    should = require('should'),
    fs = require('fs'),
    dom = require('../lib/dom.js');

describe("Scraper", function() {

  describe("()", function() {

    it("should reject a malformed definition", function() {
      var defs = [{ elements: {} },
                  { url: '.*' },
                  { url: '.*',
                    elements: {}
                  },
                  { url: "\\.*",
                    elements: { 'fulltext': {} }
                  }];
      for (var i in defs) {
        var def = defs[i];
        (function() {
          new Scraper(def);
        }).should.throwError(/^invalid ScraperJSON/);
      }
    });

    it("should accept a well formed definition", function() {
      var defs = [{
        url: "\\.*",
        elements: {
          'fulltext': {
            'selector': '//div'
          }
        }
      }];
      for (var i in defs) {
        var def = defs[i];
        (new Scraper(def)).should.be.ok;
      }
    });

  });

  describe(".matchesURL()", function() {

    it("should accept a matching URL", function() {
      var urls = ['http://website.com/tiny', // test1.json
                  'http://website.com/tiny.html', // test2.json
                  'http://website.com/regex.html' // test3.json
      ]
      var idxs = ['1','2','3'];
      for (i in idxs) {
        var idx = idxs[i];
        var defPath = __dirname + '/data/scrapers/test' + idx + '.json';
        var def = JSON.parse(fs.readFileSync(defPath, 'utf8'));
        var scraper = new Scraper(def);
        scraper.matchesURL(urls[i]).should.be.ok;
      }
    });

    it("should reject a non-matching URL", function() {
      var urls = ['http://website.com/asdasfra', // test1.json
                  'http://website.com/sdfdfew.html', // test2.json
                  'http://website.com/sjkkajk.html' // test3.json
      ];
      var idxs = ['1','2','3'];
      for (i in idxs) {
        var idx = idxs[i];
        var defPath = __dirname + '/data/scrapers/test' + idx + '.json';
        var def = JSON.parse(fs.readFileSync(defPath, 'utf8'));
        var scraper = new Scraper(def);
        scraper.matchesURL(urls[i]).should.not.be.ok;
      }
    });

  });

  describe(".annotateFollows()", function() {
    it("should add followme to elements that are followed", function() {
      var def = {
        name: 'testFollow',
        url: "\\.+",
        elements: {
          one: {
            selector: "/a",
            attribute: "href"
          },
          two: {
            selector: "/h1",
            follow: "one"
          }
        }
      }
      var scraper = new Scraper(def);
      scraper.loadElements();
      scraper.annotateFollows();
      scraper.elements.one.followme.should.be.ok;
    });
  });

  describe(".loadElements()", function() {
    it("should flatten the element tree", function() {
      var def = {
        name: 'testFollow',
        url: "\\.+",
        elements: {
          one: {
            selector: "/a",
          },
          two: {
            selector: "/h1",
          }
        }
      }
      var scraper = new Scraper(def);
      scraper.loadElements();
      scraper.elementsArray.length.should.be.exactly(2);
    });
  });

  describe(".scrapeDoc()", function() {
    it("should work", function(done) {
      var html = fs.readFileSync(__dirname + '/data/tiny.html', 'utf8')
      var doc = dom.render(html);
      var def = JSON.parse(fs.readFileSync(__dirname +
                                          '/data/scrapers/test1.json',
                                          'utf8'));
                                          var scraper = new Scraper(def);
      scraper.scrapeDoc(doc).length.should.be.exactly(1);
      done();
    });
  });

  describe(".startTicker()", function() {

  });

  describe(".scrapeElement()", function() {

  });

  describe(".downloadElement()", function() {

  });

  describe(".runRegex()", function() {

  });

  describe(".makeSubScraper()", function() {

  });

});
