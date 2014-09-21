var deps = module.exports;

// Retrieve the path to binaries installed as part of
// npm dependency packages. This is done by getting
// the path to any available module, then deconstructing
// the path to get the node_modules/.bin directory path.
//
// Currently the binary is assumed to have the same name
// as the module. This is fragile - it just happens that
// both casperjs and phantomjs meet that condition.
//
// @param {String} module name of the module
// @return {String} path to the binary
deps.getbinpath = function(module) {
  var modpath = require.resolve('shelljs').split('/');
  var phantomidx = modpath.indexOf('shelljs');
  var binpath = modpath.slice(0, phantomidx);
  binpath.push('.bin');
  binpath.push(module);
  binpath = binpath.join('/');
  return(binpath);
};
