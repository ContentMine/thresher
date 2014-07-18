var ScraperBox = require('../lib/scraperBox.js');
var should = require('should');
log = {
  info: function(){},
  warn: function(){},
  error: function(){},
  debug: function(){}
};

describe("ScraperBox", function() {

  describe("()", function() {

    it("should init with a dir of scraperJSON files", function() {
      var s = new ScraperBox(__dirname + '/data/scrapers');
      s.should.be.an.instanceOf(ScraperBox);
      s.scrapers.should.have.lengthOf(3);
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
      new ScraperBox().addScraper(s).should.not.be.ok;
    });

  });

  describe(".getScraper()", function() {

    it("should find unique scrapers matching a URL", function() {
      var s = new ScraperBox(__dirname + '/data/scrapers');
      var res = s.getScraper('http://address.com/teeny.html');
      res.name.should.be.exactly("test3");
    });

    it("should find the most specific scraper", function() {
      var s = new ScraperBox(__dirname + '/data/scrapers');
      (function() {
        s.getScraper('http://undefined.com');
      }).should.throw;
    });

    it("should fail gracefully if no scraper is found", function(){
      var s = new ScraperBox(__dirname + '/data/scrapers');
      var res = s.getScraper('http://address.com/tiny.html');
      res.name.should.be.exactly("test2");
    });

  });

});
