var Thresher = require('../lib/thresher.js'),
    ScraperBox = require('../lib/scraperBox.js'),
    should = require('should'),
    fs = require('fs'),
    path = require('path'),
    mockport = 1,
    mockserver = null,
    http = require('http');

describe("Thresher", function() {

  before(function(done) {
    this.timeout(10000);
    mockserver = require('./mockserver').app.listen();
    mockserver.on('listening', function() {
      mockport = mockserver.address().port;
      done();
    });
  });

  describe(".scrape()", function() {

    it("should extract simple XPaths", function(done) {
      var url = 'http://localhost:' + mockport + '/data/tiny.html';
      var ss = new ScraperBox(path.join(__dirname, 'data', 'scrapers'));
      var def = ss.getScraper(url);
      var thresher = new Thresher();
      thresher.scrape(url, def.elements, false);
      thresher.on('elementCaptured', function(data) {
        data.xmlns.should.be.exactly("/data/tiny2.html");
        done();
      });
    });

    it("should extract regexes", function(done) {
      var url = 'http://localhost:' + mockport + '/data/regex.html';
      var ss = new ScraperBox(path.join(__dirname, 'data', 'scrapers'));
      var def = ss.getScraper(url);
      var thresher = new Thresher();
      thresher.scrape(url, def.elements, false);
      thresher.on('elementCaptured', function(data) {
        data.answer[0].should.be.exactly("regex");
        data.answer[1].should.be.exactly("success");
        done();
      });
    });

    it("should download resources", function(done) {
      var url = 'http://localhost:' + mockport + '/data/tiny.html';
      var ss = new ScraperBox(path.join(__dirname, 'data', 'scrapers'));
      var def = ss.getScraper(url);
      def.elements.xmlns.download = { rename: 'schema.xml' };
      var thresher = new Thresher();
      thresher.scrape(url, def.elements, false);
      thresher.on('downloadCompleted', function(res) {
        fs.existsSync('schema.xml').should.be.ok;
        done();
      });
      thresher.on('downloadStarted', function(){ console.log('started'); });
    });

  });

  after(function(done) {
    mockserver.close(function() {
      done();
    });
  });

});
