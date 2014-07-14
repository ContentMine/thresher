var dl = require('../lib/download.js');
var fs = require('fs');
var should = require('should');
var temp = require('temp');
log = {
  info: function(){},
  warn: function(){},
  error: function(){},
  debug: function(){}
};
var MOCKPORT = 30045
var mockserver = require('./mockserver').app.listen(MOCKPORT);

describe("download", function() {

  describe("downloadResource()", function() {

    it("should handle relative URLs", function(done) {
      temp.open('download', function(err, info) {
        var resUrl = '/data/tiny.html'
        var scrapeUrl = 'http://localhost:' + MOCKPORT
        var rename = null;
        var down = dl.downloadResource(resUrl, scrapeUrl, rename);
        down.on('close', function() {
          fs.existsSync('tiny.html').should.be.ok;
          temp.cleanupSync();
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
      temp.open('download', function(err, info) {
        var resUrl = 'http://localhost:' + MOCKPORT + '/data/tiny2.html'
        var scrapeUrl = 'http://localhost:' + MOCKPORT
        var rename = null;
        var down = dl.downloadResource(resUrl, scrapeUrl, rename);
        down.on('close', function() {
          fs.existsSync('tiny2.html').should.be.ok;
          fs.unlink('tiny2.html', function (err) {
            if (err) throw err;
            temp.cleanupSync();
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
      temp.open('download', function(err, info) {
        var resUrl = 'data/tiny.html'
        var scrapeUrl = 'http://localhost:' + MOCKPORT
        var rename = 'blimey.html';
        var down = dl.downloadResource(resUrl, scrapeUrl, rename);
        down.on('close', function() {
          fs.existsSync('blimey.html').should.be.ok;
          temp.cleanupSync();
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
        dl.downloadResource(resUrl, scrapeUrl, rename);
      }).should.throw();
    });

  });

});
