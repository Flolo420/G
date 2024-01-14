'use strict';

var BuildsCacher = module.exports;

let Fs = require('node:fs/promises');
let Path = require('node:path');

let request = require('@root/request');
let Triplet = require('./build-classifier/triplet.js');

var ALIAS_RE = /^alias: (\w+)$/m;

var LEGACY_ARCH_MAP = {
  '*': 'ANYARCH',
  arm64: 'aarch64',
  armv6l: 'armv6',
  armv7l: 'armv7',
  amd64: 'x86_64',
  mipsle: 'mipsel',
  mips64le: 'mips64el',
  mipsr6le: 'mipsr6el',
  mips64r6le: 'mips64r6el',
  // yes... el for arm and mips, but le for ppc
  // (perhaps the joke got old?)
  ppc64el: 'ppc64le',
  386: 'x86',
};
var LEGACY_OS_MAP = {
  '*': 'ANYOS',
  macos: 'darwin',
  posix: 'posix_2017',
};

var TERMS_META = [
  // pattern
  '{ARCH}',
  '{EXT}',
  '{LIBC}',
  '{NAME}',
  '{OS}',
  '{VENDOR}',
  // // os-/arch-indepedent
  // 'ANYARCH',
  // 'ANYOS',
  // // libc
  // 'none',
  // channel
  'beta',
  'dev',
  'preview',
  'stable',
];

async function getPartialHeader(path) {
  let readme = `${path}/README.md`;
  let head = await readFirstBytes(readme).catch(function (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`warn: ${path}: ${err.message}`);
    }
    return null;
  });

  return head;
}

// let fsOpen = util.promisify(Fs.open);
// let fsRead = util.promisify(Fs.read);
async function readFirstBytes(path) {
  let start = 0;
  let n = 1024;
  let fh = await Fs.open(path, 'r');
  let buf = new Buffer.alloc(n);
  let result = await fh.read(buf, start, n);
  let str = result.buffer.toString('utf8');
  await fh.close();

  return str;
}

let promises = {};
async function getLatestBuilds(Releases, cacheDir, name, date) {
  let id = `${cacheDir}/${name}`;
  if (!promises[id]) {
    promises[id] = Promise.resolve();
  }

  promises[id] = promises[id].then(async function () {
    return await getLatestBuildsInner(Releases, cacheDir, name, date);
  });

  return await promises[id];
}

async function getLatestBuildsInner(Releases, cacheDir, name, date) {
  let data = await Releases.latest(request);

  if (!date) {
    date = new Date();
  }
  let isoDate = date.toISOString();
  let yearMonth = isoDate.slice(0, 7);

  // TODO hash file
  let dataFile = `${cacheDir}/${yearMonth}/${name}.json`;
  // TODO fsstat releases.js vs require-ing time as well
  let tsFile = `${cacheDir}/${yearMonth}/${name}.updated.txt`;

  let dirPath = Path.dirname(dataFile);
  await Fs.mkdir(dirPath, { recursive: true });

  let json = JSON.stringify(data, null, 2);
  await Fs.writeFile(dataFile, json, 'utf8');

  let seconds = date.valueOf();
  let ms = seconds / 1000;
  let msStr = ms.toFixed(3);
  await Fs.writeFile(tsFile, msStr, 'utf8');

  return data;
}

BuildsCacher.create = function ({ ALL_TERMS, installers, caches }) {
  if (!ALL_TERMS) {
    ALL_TERMS = Triplet.TERMS_PRIMARY_MAP;
  }

  let bc = {};
  bc.usedTerms = {};
  bc.orphanTerms = Object.assign({}, ALL_TERMS);
  bc.unknownTerms = {};
  bc._triplets = {};
  bc._targetsByBuildIdCache = {};
  bc._caches = {};
  bc._staleAge = 15 * 60 * 1000;

  for (let term of TERMS_META) {
    delete bc.orphanTerms[term];
  }

  bc.getPackages = async function () {
    let dirs = {
      hidden: {},
      errors: {},
      alias: {},
      invalid: {},
      selfhosted: {},
      valid: {},
    };

    let entries = await Fs.readdir(installers, { withFileTypes: true });
    for (let entry of entries) {
      // skip non-installer dirs
      if (entry.isSymbolicLink()) {
        dirs.alias[entry.name] = 'symlink';
        continue;
      }
      if (!entry.isDirectory()) {
        dirs.hidden[entry.name] = '!directory';
        continue;
      }
      if (entry.name === 'node_modules') {
        dirs.hidden[entry.name] = 'node_modules';
        continue;
      }
      if (entry.name.startsWith('_')) {
        dirs.hidden[entry.name] = '_*';
        continue;
      }
      if (entry.name.startsWith('.')) {
        dirs.hidden[entry.name] = '.*';
        continue;
      }
      if (entry.name.startsWith('~')) {
        dirs.hidden[entry.name] = '~*';
        continue;
      }
      if (entry.name.endsWith('~')) {
        dirs.hidden[entry.name] = '*~';
        continue;
      }

      // skip invalid installers
      let path = Path.join(installers, entry.name);
      let head = await getPartialHeader(path);
      if (!head) {
        dirs.invalid[entry.name] = '!README.md';
        continue;
      }

      let alias = head.match(ALIAS_RE);
      if (alias) {
        dirs.alias[entry.name] = true;
        continue;
      }

      let releasesPath = Path.join(path, 'releases.js');
      let releases;
      try {
        releases = require(releasesPath);
      } catch (err) {
        if (err.code !== 'MODULE_NOT_FOUND') {
          dirs.errors[entry.name] = err;
          continue;
        }
        if (err.requireStack.length === 2) {
          dirs.selfhosted[entry.name] = true;
          continue;
        }
        // err.requireStack.length > 1
        console.error('');
        console.error('PROBLEM');
        console.error(`    ${err.message}`);
        console.error('');
        console.error('SOLUTION');
        console.error('    npm clean-install');
        console.error('');
        throw new Error(
          '[SANITY FAIL] should never have missing modules in prod',
        );
      }

      dirs.valid[entry.name] = true;
    }

    return dirs;
  };

  // Typically a package is organized by release (ex: go has 1.20, 1.21, etc),
  // but we will organize by the build (ex: go1.20-darwin-arm64.tar.gz, etc).
  bc.getBuilds = async function ({ Releases, name, date }) {
    let cacheDir = caches;
    let installerDir = installers;

    if (!Releases) {
      Releases = require(`${installerDir}/${name}/releases.js`);
    }
    // TODO update all releases files with object export
    if (!Releases.latest) {
      Releases.latest = Releases;
    }

    if (!date) {
      date = new Date();
    }
    let isoDate = date.toISOString();
    let yearMonth = isoDate.slice(0, 7);
    let dataFile = `${cacheDir}/${yearMonth}/${name}.json`;

    // let secondsStr = await Fs.readFile(tsFile, 'ascii').catch(function (err) {
    //   if (err.code !== 'ENOENT') {
    //     throw err;
    //   }
    //   return '0';
    // });
    // secondsStr = secondsStr.trim();
    // let seconds = parseFloat(secondsStr) || 0;

    // let age = now - seconds;

    let data = bc._caches[name];
    let versions = data?.versions || [];
    let triplets = [];
    let now = date.valueOf();
    if (data) {
      process.nextTick(async function () {
        let age = now - data.updated;
        if (age < bc._staleAge) {
          return;
        }
        data = await getLatestBuilds(Releases, cacheDir, name);
        let updated = date.valueOf();
        updateVersions(data, versions);
        Object.assign(data, { name, updated, versions, triplets });
        bc._caches[name] = data;
      });
      return data;
    }

    let json = await Fs.readFile(dataFile, 'ascii').catch(async function (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }

      return null;
    });

    try {
      data = JSON.parse(json);
    } catch (e) {
      console.error(`error: ${dataFile}:\n\t${e.message}`);
      data = null;
    }

    if (!data) {
      data = await getLatestBuilds(Releases, cacheDir, name);
    }
    let updated = date.valueOf();
    updateVersions(data, versions);
    Object.assign(data, { name, updated, versions, triplets });
    bc._caches[name] = data;

    for (let build of data.releases) {
      if (LEGACY_OS_MAP[build.os]) {
        build.os = LEGACY_OS_MAP[build.os];
      }
      if (LEGACY_ARCH_MAP[build.arch]) {
        build.arch = LEGACY_ARCH_MAP[build.arch];
      }
    }

    return data;
  };

  // TODO
  //   - sort version
  //   - tag channels
  //   - @beta not install older than stable
  function updateVersions(data, versions) {
    for (let release of data.releases) {
      let hasVersion = versions.includes(release.version);
      if (!hasVersion) {
        versions.unshift(release.version);
      }
    }
  }

  // Makes sure that packages are updated once an hour, on average
  bc._staleNames = [];
  bc._freshenTimeout = null;
  bc.freshenRandomPackage = async function (minDelay) {
    if (!minDelay) {
      minDelay = 15 * 1000;
    }

    if (bc._staleNames.length === 0) {
      let dirs = await bc.getPackages();
      bc._staleNames = Object.keys(dirs.valid);
      bc._staleNames.sort(function () {
        return 0.5 - Math.random();
      });
    }

    let name = bc._staleNames.pop();
    let Releases = require(`${installers}/${name}/releases.js`);
    //data = await getLatestBuilds(Releases, cacheDir, name);
    void (await bc.getBuilds({
      Releases: Releases,
      name: name,
      date: new Date(),
    }));

    let hour = 60 * 60 * 1000;
    let delay = minDelay;
    let spread = hour / bc._staleNames.length;
    let seed = Math.random();
    delay += seed * spread;

    clearTimeout(bc._freshenTimeout);
    bc._freshenTimeout = setTimeout(bc.freshenRandomPackage, delay);
    bc._freshenTimeout.unref();
  };

  bc.classify = function (pkg, build) {
    let maybeInstallable = Triplet.maybeInstallable(pkg, build);
    if (!maybeInstallable) {
      return null;
    }

    // because some packages are shimmed to match a single download against
    let preTarget = Object.assign({ os: '', arch: '', libc: '' }, build);

    let targetId = `${preTarget.os}:${preTarget.arch}:${preTarget.libc}`;
    let buildId = `${pkg.name}:${targetId}@${build.download}`;
    let target = bc._targetsByBuildIdCache[buildId];
    if (target) {
      Object.assign(build, { target: target, triplet: target.triplet });
      return target;
    }

    let pattern = Triplet.toPattern(pkg, build);
    if (!pattern) {
      let err = new Error(`no pattern generated for ${name}`);
      err.code = 'E_BUILD_NO_PATTERN';
      target = { error: err };
      bc._targetsByBuildIdCache[buildId] = target;
      return target;
    }

    let rawTerms = pattern.split(/[_\{\}\/\.\-]+/g);
    for (let term of rawTerms) {
      delete bc.orphanTerms[term];
      bc.usedTerms[term] = true;
    }

    // {NAME}/{NAME}-{VER}-Windows-x86_64_v2-musl.exe =>
    //     {NAME}.windows.x86_64v2.musl.exe
    let terms = Triplet.patternToTerms(pattern);
    if (!terms.length) {
      let err = new Error(`'${terms}' was trimmed to ''`);
      target = { error: err };
      bc._targetsByBuildIdCache[buildId] = target;
      return target;
    }

    for (let term of terms) {
      if (!term) {
        continue;
      }

      if (ALL_TERMS[term]) {
        delete bc.orphanTerms[term];
        bc.usedTerms[term] = true;
        continue;
      }

      bc.unknownTerms[term] = true;
    }

    // {NAME}.windows.x86_64v2.musl.exe
    //     windows-x86_64_v2-musl
    target = { triplet: '' };
    void Triplet.termsToTarget(target, pkg, build, terms);

    target.triplet = `${target.arch}-${target.vendor}-${target.os}-${target.libc}`;
    let hasTriplet = pkg.triplets.includes(target.triplet);
    if (!hasTriplet) {
      // TODO I don't love this hidden behavior
      // perhaps classify should just happen when the package is loaded
      // (and the sanity error should be removed, or thrown after the loop is complete)
      pkg.triplets.push(target.triplet);
    }

    bc._triplets[target.triplet] = true;
    bc._targetsByBuildIdCache[buildId] = target;

    let triple = [target.arch, target.vendor, target.os, target.libc];
    for (let term of triple) {
      if (!ALL_TERMS[term]) {
        throw new Error(
          `[SANITY FAIL] '${pkg.name}' '${target.triplet}' generated unknown term '${term}'`,
        );
      }

      delete bc.orphanTerms[term];
      bc.usedTerms[term] = true;
    }

    return target;
  };

  return bc;
};
