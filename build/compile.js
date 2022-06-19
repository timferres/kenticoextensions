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
  var dateTimeString = new Date().toISOString();
  var dateTimeStamp =
    dateTimeString.substring(0, 10) + ' ' + dateTimeString.substring(11, 19);
  return dateTimeStamp;
}
