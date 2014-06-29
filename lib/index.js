var thresher = module.exports;
var winston = require('winston');

log = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({ level: 'info' })
  ]
});
log.cli();

thresher.deps = require('./dependencies.js');
thresher.dom = require('./dom.js');
thresher.file = require('./file.js');
thresher.url = require('./url.js');
thresher.download = require('./download.js');
thresher.ticker = require('./ticker.js');
thresher.scraperJSON = require('./scraperJSON.js');
thresher.scrape = require('./scrape.js')
