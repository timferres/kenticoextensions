const esbuild = require('esbuild');

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
});

function onRebuild(error, _result) {
  if (error) {
    console.error('watch build failed:', error);
  } else {
    console.info('rebuild succeeded');
  }
}
