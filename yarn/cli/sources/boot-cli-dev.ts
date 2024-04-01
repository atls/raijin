import { existsSync }    from 'fs'
import { dirname }       from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Makes it possible to access our dependencies
const pnpFile = `${__dirname}/../../../.pnp.cjs`
if (existsSync(pnpFile)) {
  // eslint-disable-next-line no-console
  console.log('found it')
  require(pnpFile).setup()
}

require(`@yarnpkg/monorepo/scripts/setup-ts-execution`)
require(`@yarnpkg/monorepo/scripts/setup-local-plugins`)

require(`./cli`)
