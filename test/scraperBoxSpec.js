var ScraperBox = require('../lib/scraperBox.js'),
    should = require('should');

describe("ScraperBox", function() {

  describe("()", function() {

    it("should init with a dir of scraperJSON files", function() {
      var s = new ScraperBox(__dirname + '/data/scrapers');
      s.should.be.an.instanceOf(ScraperBox);
      s.scrapers.should.have.lengthOf(5);
    });

    it("should init with no dir", function() {
      var s = new ScraperBox();
      s.should.be.an.instanceOf(ScraperBox);
      s.scrapers.should.have.lengthOf(0);
    });

    it("should throw if the directory doesn't exist", function() {
      (function() {
        new ScraperBox('./data/nonexistent');
      }).should.throw();
    });

  });

  describe(".addScraper()", function() {

    it("should reject an invalid scraper", function() {
      var s = {
        url: "some.url",
        elephants: {
          this: "should not work"
        }
      };
      var sb = new ScraperBox();
      sb.addScraper(s).should.be.false;
    });

  });

  describe(".getScraper()", function() {

    it("should find unique scrapers matching a URL", function() {
      var s = new ScraperBox(__dirname + '/data/scrapers');
      var res = s.getScraper('http://address.com/regex.html');
      res.name.should.be.exactly("test3");
    });

    it("should fail gracefully if no scraper is found", function() {
      var s = new ScraperBox(__dirname + '/data/scrapers');
      (function() {
        s.getScraper('http://undefined.com');
      }).should.throw;
    });

    it("should find the most specific scraper", function(){
      var s = new ScraperBox(__dirname + '/data/scrapers');
      var res = s.getScraper('http://address.com/tiny.html');
      res.name.should.be.exactly("test2");
    });

  });

});
