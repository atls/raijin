const babel = require('@babel/core')
const { dirname } = require('path')
const { join } = require('path')
const { tmpdir } = require('os')

const weeksSinceUNIXEpoch = Math.floor(Date.now() / 604800000)

if (!process.env.BABEL_CACHE_PATH)
  process.env.BABEL_CACHE_PATH = join(
    tmpdir(),
    'babel',
    `.babel.${babel.version}.${babel.getEnv()}.${weeksSinceUNIXEpoch}.json`
  )

require('@babel/register')({
  root: dirname(__dirname),
  extensions: ['.tsx', '.ts'],
  only: [(p) => '/'],
  plugins: [
    require.resolve('@babel/plugin-transform-modules-commonjs'),
    require.resolve('@babel/plugin-proposal-optional-chaining'),
    require.resolve('@babel/plugin-proposal-nullish-coalescing-operator'),
    [require.resolve('@babel/plugin-proposal-decorators'), { legacy: true }],
    [require.resolve('@babel/plugin-proposal-class-properties'), { loose: true }],
    require.resolve('@babel/plugin-proposal-async-generator-functions'),
  ],
  presets: [require.resolve('@babel/preset-typescript'), require.resolve('@babel/preset-react')],
})
