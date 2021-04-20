/* eslint-disable import/no-dynamic-require */

require(`${__dirname}/.pnp.js`).setup()
require(`${__dirname}/utils/setup-ts-execution/src/index.js`)

require('@yarnpkg/cli/lib/polyfills')

const { main } = require('@yarnpkg/cli/lib/main')
const { getPluginConfiguration } = require('@yarnpkg/cli/lib/tools/getPluginConfiguration')

main({
  binaryVersion: `<unknown>`,
  pluginConfiguration: getPluginConfiguration(),
})
