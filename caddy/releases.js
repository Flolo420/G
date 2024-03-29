'use strict';

var github = require('../_common/github.js');
var owner = 'caddyserver';
var repo = 'caddy';

module.exports = function (request) {
  return github(request, owner, repo).then(function (all) {
    // remove checksums and .deb
    all.releases = all.releases.filter(function (rel) {
      let isOneOffAsset = rel.download.includes('buildable-artifact');
      if (isOneOffAsset) {
        return false;
      }

      return true;
    });
    return all;
  });
};

if (module === require.main) {
  module.exports(require('@root/request')).then(function (all) {
    all = require('../_webi/normalize.js')(all);
    console.info(JSON.stringify(all));
  });
}
