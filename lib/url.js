var request = require("request");
var nodeurl = require("url");
var url = module.exports;

// Check a URL meets basic validity requirements.
// Return true if the URL is of the form:
// http://domain.tld[/other/parts]
// OR
// https://...
// ftp://...
// Otherwise, raise an Error.
// @param {String} theUrl the URL to validate
url.checkUrl = function(theUrl) {
  var protocol = /^(f|ht)tps?:\/\//i.test(theUrl);
  var domain = /:\/\/\w+(\.[^:]+)*([:\/].+)*$/i.test(theUrl);
  if (!protocol || !domain) {
    // not a valid URL
    var msg = 'malformed URL: ' + theUrl + '; '
    if (!protocol) {
      msg += 'protocol missing (must include http(s):// or ftp(s)://)'
    }
    if (!domain) {
      if (!protocol) {
        msg += ', '
      }
      msg += 'domain missing'
    }
    var e = new Error(msg);
    throw e;
  }
  return true;
}

// Convert a file:/// url to an absolute remote URL.
//
// Rendering pages locally sometimes adds a spurious
// 'file:///' to the beginning of relative resource paths.
// This function strips the 'file:///' and constructs an
// absolute url.
//
// @param {String} path resource path to clean
// @param {String} pageUrl URL of the page the resource was linked from
url.cleanResourcePath = function(path, pageUrl) {
  if (/^(f|ht)tps?:\/\//i.test(path)) {
    // already absolute
    return path;
  } else if (/^file:\/\/\/?/i.test(path) ||
            (/^\//.test(path))) {
    // root relative path
    var relative = path.replace(/^(file:)?\/+/gi, '/');
    return nodeurl.resolve(pageUrl, relative)
  } else {
    return nodeurl.resolve(pageUrl, path);
  }
}

// Resolve HTTP redirects
url.resolveRedirects = function(url, callback) {
  request({ url: url, method: 'HEAD' }, function(err, response, body){
    callback(err, response.request.href);
  });
}
