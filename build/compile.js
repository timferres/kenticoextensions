const esbuild = require('esbuild');
const fse = require('fs-extra');

const outfile = process.env.OUTFILE;
const env = process.env.NODE_ENV;
const sourcemap =
  process.env.SOURCEMAP === undefined ? true : process.env.SOURCEMAP;
const target = process.env.TARGET || 'chrome100';

const minify = env === 'production';
const watch =
  env === 'development'
    ? {
        onRebuild,
      }
    : false;

console.log(`Compiling for ${env}`);

const config = {
  entryPoints: ['src/kenticoextensions.js'],
  outfile,
  bundle: true,
  watch,
  sourcemap,
  minify,
  target,
};

console.table(config);

esbuild.build(config).then((_result) => {
  const message = watch ? `Watching...` : 'Compilation complete';
  console.log(message);
  if (env === 'development') {
    copyFolder();
  }
});

function onRebuild(error, _result) {
  if (error) {
    console.error(getDateTimeStamp() + ': watch build failed:', error);
  } else {
    console.info(getDateTimeStamp() + ': rebuild succeeded');
  }
  if (env === 'development') {
    copyFolder();
  }
}

const cmsdir = process.env.CMSDIR;
const copytodmsdir = process.env.COPYTOCMSDIR;

function copyFolder() {
  if (!copytodmsdir) {
    return;
  }
  const srcDir = './kenticoextensions';
  const destDir = cmsdir + '/kenticoextensions';
  fse
    .copy(srcDir, destDir, { overwrite: true })
    .then(() => console.log(getDateTimeStamp() + ': folder copy success!'))
    .catch((err) => console.error(err));
}

function getDateTimeStamp() {
  var cdt = new Date();
  var hours = cdt.getHours();
  var ampm = hours >= 12 ? 'PM' : 'AM';
  if (hours > 12) {
    hours = hours - 12;
  }
  var cdts =
    cdt.getFullYear() +
    '-' +
    ('0' + (cdt.getMonth() + 1)).slice(-2) +
    '-' +
    ('0' + cdt.getDate()).slice(-2) +
    ' ' +
    ('0' + hours).slice(-2) +
    ':' +
    ('0' + cdt.getMinutes()).slice(-2) +
    ':' +
    ('0' + cdt.getSeconds()).slice(-2);
  cdts += ' ' + ampm;
  return cdts;
}
