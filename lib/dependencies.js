var deps = module.exports;

// This is fragile - it just happens that both casperjs
// and phantomjs have a binary with the same name as the
// module
deps.getbinpath = function(module) {
  log.debug('function getbinpath: ' + module);
  var modpath = require.resolve('shelljs').split('/');
  var phantomidx = modpath.indexOf('shelljs');
  var binpath = modpath.slice(0, phantomidx);
  binpath.push('.bin');
  binpath.push(module);
  binpath = binpath.join('/');
  log.debug('path for module :' + module + ': ' + binpath);
  return(binpath);
};
