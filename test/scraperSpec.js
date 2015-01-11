var Scraper = require('../lib/scraper.js'),
    should = require('should'),
    fs = require('fs'),
    dom = require('../lib/dom.js'),
    temp = require('temp');

temp.track();

describe("Scraper", function() {

  var mockserver = null,
      mockport = null;

  before(function(done) {
    this.timeout(10000);
    mockserver = require('./mockserver').app.listen();
    mockserver.on('listening', function() {
      mockport = mockserver.address().port;
      done();
    });
  });

  describe("()", function() {

    it("should reject a malformed definition", function() {
      var defs = [
        { elements: {} }, // empty elements, no url
        { url: '.*' }, // no elements
        { // empty elements
          url: '.*',
          elements: {}
        },
        { // element specified doesn't have selector
          url: "\\.*",
          elements: { 'fulltext': {} }
        },
        { // nested elements doesn't have selector
          url: "\\.*",
          elements: {
            section: {
              abstract: {}
            }
          }
        }
      ];
      for (var i in defs) {
        var def = defs[i];
        (function() {
          new Scraper(def);
        }).should.throwError(/^invalid ScraperJSON/);
      }
    });

    it("should accept a well formed definition", function() {
      var defs = [
        { // normal single-level element
          url: "\\.*",
          elements: {
            fulltext: {
              selector: '//div'
            }
          }
        },
        { // nested element
          url: "\\.*",
          elements: {
            section: {
              abstract: {
                selector: '//div'
              }
            }
          }
        }
      ];
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

  describe(".loadElements()", function() {

    it("should flatten the element tree", function() {
      var def = {
        name: 'testFollow',
        url: "\\.+",
        elements: {
          one: {
            selector: "/a"
          },
          two: {
            selector: "/h1"
          },
          box: {
            three: {
              selector: "/div"
            }
          }
        }
      }
      var scraper = new Scraper(def);
      scraper.loadElements();
      scraper.elementsArray.length.should.be.exactly(3);
    });

  });

  describe(".scrapeUrl()", function() {

    this.timeout(20000);

    it("should follow-on with followables", function(done) {
      var url = 'http://localhost:' + mockport + '/data/tiny.html';
      var def = JSON.parse(fs.readFileSync(__dirname +
                                          '/data/scrapers/follow.json',
                                          'utf8'));
      var scraper = new Scraper(def);
      scraper.on('end', function(results, structured) {
        structured.should.have.property('inputName');
        structured.inputName.should.have.property('value');
        structured.inputName.value.should.have.lengthOf(2);
        done();
      });

      scraper.scrapeUrl(url);

    });

    it("should follow-on with the follow property", function(done) {
      var url = 'http://localhost:' + mockport + '/data/tiny.html';
      var def = JSON.parse(fs.readFileSync(__dirname +
                                          '/data/scrapers/follow2.json',
                                          'utf8'));
      var scraper = new Scraper(def);

      scraper.on('end', function(results, structured) {
        structured.should.have.property('inputName');
        structured.inputName.should.have.property('value');
        structured.inputName.value.should.have.lengthOf(2);
        done();
      });

      scraper.scrapeUrl(url);

    });

  });

  describe(".startTicker()", function() {

    var def = JSON.parse(fs.readFileSync(__dirname +
                                        '/data/scrapers/test1.json',
                                        'utf8'));
    var scraper = new Scraper(def);
    scraper.startTicker();
    scraper.ticker.length.should.equal(0);

  });

  describe(".scrapeElement()", function() {

    it("should work", function(done) {
      var def = JSON.parse(fs.readFileSync(__dirname +
                                          '/data/scrapers/test1.json',
                                          'utf8'));
      var scraper = new Scraper(def);
      var htmPath = __dirname + '/data/tiny.html';
      var doc = dom.render(fs.readFileSync(htmPath, 'utf8'));

      scraper.on('elementCaptured', function(key, result) {
        key.should.equal('xmlns');
        result.should.equal('/data/tiny2.html');
        done();
      });

      scraper.scrapeElement(doc, scraper.elementsArray[0]);
    });

  });

  describe(".downloadElement()", function() {

    it("should download from captured URLs", function(done) {
      temp.mkdir('download', function(err, dirPath) {
        var def = JSON.parse(fs.readFileSync(__dirname +
                                            '/data/scrapers/test1.json',
                                            'utf8'));
        def.elements.xmlns.download = true;
        var scraper = new Scraper(def);
        var theUrl = 'http://localhost:' + mockport + '/data/tiny.html';

        scraper.on('downloadSaved', function() {
          fs.existsSync('tiny2.html').should.be.ok;
          done();
        });

        scraper.scrapeUrl(theUrl);
      });
    });

  });

  describe(".runRegex()", function() {

    it("should return an array of matches", function(done) {
      var def = JSON.parse(fs.readFileSync(__dirname +
        '/data/scrapers/test3.json',
        'utf8'));
      var scraper = new Scraper(def);
      var regex = "Published:\\s(.+)";
      var text = "Published: October 03, 2011"
      var res = scraper.runRegex(text, regex);
      res.should.be.an.instanceOf(Array);
      res.should.have.lengthOf(1);
      res[0].should.equal('October 03, 2011');
      done();
    });

    it("should work when run through a scraper", function(done) {
      var def = JSON.parse(fs.readFileSync(__dirname +
        '/data/scrapers/test3.json',
        'utf8'));
      var scraper = new Scraper(def);
      var htmPath = __dirname + '/data/regex.html';
      var doc = dom.render(fs.readFileSync(htmPath, 'utf8'));

      scraper.on('elementCaptured', function(key, result) {
        key.should.equal('answer');
        result[0].should.equal('October 03, 2011');
        done();
      });
      
      scraper.scrapeElement(doc, scraper.elementsArray[0]);
    });

  });

});
