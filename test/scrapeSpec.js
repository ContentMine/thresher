var scrape = require('../lib/scrape.js');
var should = require('should');
var express = require('express');

describe("scrape", function() {

  var app = express();

  // simple xpath example
  var xpath_easy = '<html><div>hello</div></html>';
  var xpath_easy_def = {
    url: "localhost",
    elements: {
      example: "/div"
    }
  }

  // simple attribute example
  var xpath_attr = '<html><a class="button" href="hello"></a></html>';
  var xpath_attr_def = {
    url: "localhost",
    elements: {
      example: "/a[@class='button']",
      attribute: 'href'
    }
  }

  describe(".scrape()", function() {

    it("should fail gracefully when a connection can't be made", function() {
      // def = {
      //   url: "localhost",
      //   elements: {
      //     example: "/div"
      //   }
      // }
      // (function(){
      //   scrape.scrape('http://localhost/nonexistant.html', def, done);
      // }).should.throw;
    });

    it("should extract simple XPaths", function() {

    });

    it("should download resources", function() {
      // false.should.be.ok;
    });

    it("should extract specified attributes", function() {
      // false.should.be.ok;
    });

    it("should handle multiple selector hits", function() {
      // false.should.be.ok;
    });

    it("should callback on completion", function() {
      // false.should.be.ok;
    });

  });

});
