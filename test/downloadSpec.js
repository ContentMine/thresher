var dl = require('../lib/download.js');
var fs = require('fs');
var should = require('should');
var temp = require('temp');
temp.track();

require('shelljs/global');

var mockport = 1
var mockserver = null;

describe("download", function() {

  before(function(done) {
    this.timeout(10000);
    mockserver = require('./mockserver').app.listen();
    mockserver.on('listening', function() {
      mockport = mockserver.address().port;
      done();
    });
  });

  describe("downloadResource()", function() {

    it("should handle relative URLs", function(done) {
      temp.mkdir('download', function(err, dirPath) {
        cd(dirPath);
        var resUrl = '/data/tiny.html'
        var scrapeUrl = 'http://localhost:' + mockport
        var rename = null;
        var down = dl.downloadResource(resUrl, scrapeUrl, rename, null);
        down.on('downloadComplete', function() {
          fs.existsSync('tiny.html').should.be.ok;
          done();
        });
        down.on('error', function(err) {
          if (err) {
            console.log('download error for relative URL');
            console.log(err);
            throw err;
          }
          done();
        });
      });
    });

    it("should handle absolute URLs", function(done) {
      temp.mkdir('download', function(err, dirPath) {
        cd(dirPath);
        var resUrl = 'http://localhost:' + mockport + '/data/tiny2.html'
        var scrapeUrl = 'http://localhost:' + mockport
        var rename = null;
        var down = dl.downloadResource(resUrl, scrapeUrl, rename, null);
        down.on('downloadComplete', function() {
          fs.existsSync('tiny2.html').should.be.ok;
          fs.unlink('tiny2.html', function (err) {
            if (err) throw err;
            done();
          });
        });
        down.on('error', function(err) {
          if (err) {
            console.log('download error for absolute URL');
            console.log(err);
            throw err;
          }
          done();
        });
      });
    });

    it("should rename downloaded files", function(done) {
      temp.mkdir('download', function(err, dirPath) {
        cd(dirPath);
        var resUrl = 'data/tiny.html'
        var scrapeUrl = 'http://localhost:' + mockport
        var rename = 'blimey.html';
        var down = dl.downloadResource(resUrl, scrapeUrl, rename, null);
        down.on('downloadComplete', function() {
          fs.existsSync('blimey.html').should.be.ok;
          done();
        });
        down.on('error', function(err) {
          if (err) {
            console.log('download error for renaming');
            console.log(err);
            throw err;
          }
          done();
        });
      });
    });

    it("should reject a null URL", function() {
      (function() {
        dl.downloadResource(resUrl, scrapeUrl, rename, null);
      }).should.throw();
    });

  });

});
