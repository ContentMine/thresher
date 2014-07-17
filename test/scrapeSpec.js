var Thresher = require('../lib/thresher.js'),
    ScraperBox = require('../lib/scraperBox.js'),
    should = require('should'),
    fs = require('fs'),
    path = require('path'),
    MOCKPORT = 30045,
    mockserver = require('./mockserver').app.listen(MOCKPORT),
    http = require('http');

describe("scrape", function() {

  describe(".scrape()", function() {

    this.timeout(20000);

    it("should extract simple XPaths", function(done) {
      var url = 'http://localhost:' + MOCKPORT + '/data/tiny.html';
      var ss = new ScraperBox(path.join(__dirname, 'data', 'scrapers'));
      var def = ss.getScraper(url);
      var thresher = new Thresher();
      thresher.scrape(url, def.elements);
      thresher.on('elementCaptured', function(data) {
        console.log(data);
        data.xmlns.should.be.exactly("http://www.w3.org/1999/xhtml");
        done();
      });
    });

    it("should download resources", function(done) {
      this.timeout(10000);
      var url = 'http://localhost:' + MOCKPORT + '/data/tiny.html';
      var ss = new ScraperBox(path.join(__dirname, 'data', 'scrapers'));
      var def = ss.getScraper(url);
      def.elements.xmlns.download = { rename: 'schema.xml' };
      var thresher = new Thresher();
      thresher.scrape(url, def.elements);
      thresher.on('downloadCompleted', function(res) {
        fs.existsSync('schema.xml').should.be.ok;
        done();
      });
    });

  });

});
