var rf = module.exports;

// Result formatters take a result object and output it,
// applying a specified format.

// Convert result to long format:
// an array of objects, where each
// object contains a single instance of an element capture.
rv.longJSON = function(result) {
  var new = [];
  if (typeof(result) == 'object') {
    // iterate over key-value pairs
    // splitting container values into one object per value
  }
}

// Convert result to wide format:
// An object where each key has a value
// which contains all instances of captured elements matching the key.
rv.wideJSON = function(result) {
  var new = {};
  if (typeof(result) == 'array') {
    // iterate through array adding object contents
    // to new and aggregating values with matched keys into containers
  }
}
