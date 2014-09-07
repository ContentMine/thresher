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

    it("should control a scrape", function(done) {
      var url = 'http://localhost:' + mockport + '/data/tiny.html';
      var ss = new ScraperBox(path.join(__dirname, 'data', 'scrapers'));
      var thresher = new Thresher(ss);

      thresher.on('result', function(result) {
        result.should.have.property('xmlns');
        result.xmlns.should.have.property('value').with.lengthOf(1);
        result.xmlns.value[0].should.be.exactly("/data/tiny2.html");
        done();
      });

      thresher.scrape(url, false);

    });

  });

  after(function(done) {
    mockserver.close(function() {
      done();
    });
  });

});
