/* eslint-disable import/no-dynamic-require */

require(`${__dirname}/.pnp.cjs`).setup()
require(`${__dirname}/utils/setup-ts-execution/src/index.js`)

process.env.NODE_OPTIONS = process.env.NODE_OPTIONS
  ? [process.env.NODE_OPTIONS, `--require ${__dirname}/.pnp.cjs`].join(' ')
  : `--require ${__dirname}/.pnp.cjs`

require('@yarnpkg/cli/lib/polyfills')

const { main } = require('@yarnpkg/cli/lib/main')
const { getPluginConfiguration } = require('@yarnpkg/cli/lib/tools/getPluginConfiguration')

main({
  binaryVersion: `<unknown>`,
  pluginConfiguration: getPluginConfiguration(),
})
