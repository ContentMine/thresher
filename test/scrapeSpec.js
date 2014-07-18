var Thresher = require('../lib/thresher.js'),
    ScraperBox = require('../lib/scraperBox.js'),
    should = require('should'),
    fs = require('fs'),
    path = require('path'),
    MOCKPORT = 30046,
    mockserver = null,
    http = require('http');

log = {
  info: function(){},
  data: function(){},
  warn: function(){},
  error: function(){},
  debug: function(){}
};

describe("scrape", function() {

  before(function(done) {
    this.timeout(10000);
    mockserver = require('./mockserver').app.listen(MOCKPORT);
    mockserver.on('listening', function() {
      done();
    });
  });

  describe(".scrape()", function() {

    it("should extract simple XPaths", function(done) {
      var url = 'http://localhost:' + MOCKPORT + '/data/tiny.html';
      var ss = new ScraperBox(path.join(__dirname, 'data', 'scrapers'));
      var def = ss.getScraper(url);
      var thresher = new Thresher();
      thresher.scrape(url, def.elements, false);
      thresher.on('elementCaptured', function(data) {
        data.xmlns.should.be.exactly("http://www.w3.org/1999/xhtml");
        done();
      });
    });

    it("should download resources", function(done) {
      var url = 'http://localhost:' + MOCKPORT + '/data/tiny.html';
      var ss = new ScraperBox(path.join(__dirname, 'data', 'scrapers'));
      var def = ss.getScraper(url);
      def.elements.xmlns.download = { rename: 'schema.xml' };
      var thresher = new Thresher();
      thresher.scrape(url, def.elements, false);
      thresher.on('downloadCompleted', function(res) {
        fs.existsSync('schema.xml').should.be.ok;
        done();
      });
    });

  });

  after(function(done) {
    mockserver.close(function() {
      done();
    });
  });

});
