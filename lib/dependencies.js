var deps = module.exports;

// This is fragile - it just happens that both casperjs
// and phantomjs have a binary with the same name as the
// module
deps.getbinpath = function(module) {
  var modpath = require.resolve(module).split('/');
  var phantomidx = modpath.indexOf(module);
  var binpath = modpath.slice(0, phantomidx);
  binpath.push('.bin');
  binpath.push(module);
  binpath = binpath.join('/');
  return(binpath);
};
