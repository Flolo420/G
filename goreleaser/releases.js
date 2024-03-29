'use strict';

var github = require('../_common/github.js');
var owner = 'goreleaser';
var repo = 'goreleaser';

module.exports = function (request) {
  return github(request, owner, repo).then(function (all) {
    all._names = ['goreleaser', '1'];
    return all;
  });
};

if (module === require.main) {
  module.exports(require('@root/request')).then(function (all) {
    all = require('../_webi/normalize.js')(all);
    // just select the first 5 for demonstration
    all.releases = all.releases.slice(0, 5);
    console.info(JSON.stringify(all, null, 2));
  });
}
