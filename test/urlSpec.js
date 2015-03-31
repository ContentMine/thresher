var url = require('../lib/url.js'),
    should = require('should'),
    request = require('request');

describe("url", function() {

  describe(".resolveRedirects()", function() {

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

    it("should resolve redirects", function(done) {
      var toresolve = "http://localhost:" + mockport + "/redirect";
      var target = "http://localhost:" + mockport + "/data/tiny.html";
      url.resolveRedirects(toresolve, function(err, resolved){
        if (err) {
          console.log(err);
          throw err;
        }
        resolved.should.be.exactly(target);
        done();
      });
    });
  });

  describe(".checkUrl()", function() {

    it("should reject an invalid URL", function() {
      var urls = ["http://nsnkfnaksfasfkn33!!",
                  "blereehahsd.9:1",
                  "fake://url"];
      for (var i in urls) {
        var thisUrl = urls[i];
        (function() {
          url.checkUrl(thisUrl);
        }).should.throw(/^malformed URL/);
      }
    });

    it("should accept a valid URL", function() {
      var urls = ["http://realaddress.com",
                  "https://peerj.com/article/123",
                  "ftp://ncbi.org"];
      for (var i in urls) {
        var thisUrl = urls[i];
        url.checkUrl(thisUrl).should.be.true;
      }
    });

  });

  describe(".cleanResourcePath()", function() {

    it("should leave an absolute path unchanged", function() {
      var paths = ["http://visionmedia.github.io/mocha/#interfaces",
                  "https://www.google.com/calendar/render?tab=mc",
                  "ftp://ftp.arabidopsis.org/home/tair/Ontologies/Gene_Ontology/"];
      for (var i in paths) {
        var path = paths[i];
        url.cleanResourcePath(path, path).should.equal(path);
      }
    });

    it("should clean a root-relative path", function() {
      var sets = [["file:///resources/photo.png",          // resource
                   "http://realsite.com/blog/pages.html"], // page
                  ["/article/images/213.gif",              // resource
                   "https://peerj.com/article/123"],       // page
                  ["file:///software/BLAST/README.txt",
                   "ftp://ncbi.org/software/BLAST/releases/1.2.3"]
                 ];
      var results = [
        "http://realsite.com/resources/photo.png",
        "https://peerj.com/article/images/213.gif",
        "ftp://ncbi.org/software/BLAST/README.txt"
      ]
      for (var i in sets) {
        var set = sets[i];
        var resource = set[0];
        var page = set[1];
        url.cleanResourcePath(resource, page).should.equal(results[i]);
      }
    });

    it("should clean a base-relative path", function() {
      var sets = [["resources/photo.png",                  // resource
                   "http://realsite.com/blog/pages.html"], // page
                  ["213.gif",                              // resource
                   "https://peerj.com/article/123/"],              // page
                  ["README.txt",
                   "ftp://ncbi.org/software/BLAST/releases/1.2.3"]
                 ];
      var results = [
        "http://realsite.com/blog/resources/photo.png",
        "https://peerj.com/article/123/213.gif",
        "ftp://ncbi.org/software/BLAST/releases/README.txt"
      ]
      for (var i in sets) {
        var set = sets[i];
        var resource = set[0];
        var page = set[1];
        url.cleanResourcePath(resource, page).should.equal(results[i]);
      }
    });

  });


});
