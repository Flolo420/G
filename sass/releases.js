'use strict';

var github = require('../_common/github.js');
var owner = 'sass';
var repo = 'dart-sass';

module.exports = function (request) {
  return github(request, owner, repo).then(function (all) {
    all._names = ['dart-sass', 'sass'];
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
