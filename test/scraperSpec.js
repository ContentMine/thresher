var Scraper = require('../lib/scraper.js'),
    should = require('should'),
    fs = require('fs');

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

});
