import pnp from '../../../.pnp.cjs'

pnp.setup()

import('./cli.ts')

/*
const { join } = require('node:path')

require(`${__dirname}/../../../.pnp.cjs`).setup()
require('@atls/tools-setup-ts-execution')

process.execArgv.push('--require')
process.execArgv.push(join(__dirname, '../../../.pnp.cjs'))

process.execArgv.push('--require')
process.execArgv.push(require.resolve('@atls/tools-setup-ts-execution'))

global.YARN_VERSION = `${require('@yarnpkg/cli/package.json').version}.dev`

module.exports = require('./cli')
*/
