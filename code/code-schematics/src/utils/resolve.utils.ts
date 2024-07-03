import { dirname } from 'node:path'
import { join }    from 'node:path'

const dynamicRequire = eval('require') // eslint-disable-line no-eval

const findPnpApiPath = (cwd?: string) => {
  if (process.versions.pnp) {
    // eslint-disable-next-line
    return require('module').findPnpApi(__filename).resolveRequest('pnpapi', null)
  }

  return join(cwd || process.cwd(), '.pnp.cjs')
}

// eslint-disable-next-line
const setupPnp = (cwd?: string) => {
  const pnpPath = findPnpApiPath(cwd)

  // eslint-disable-next-line
  dynamicRequire(pnpPath).setup()
}

// eslint-disable-next-line
export const resolveSchematics = (cwd?: string) => {
  try {
    // eslint-disable-next-line
    return join(dirname(dynamicRequire.resolve('@atls/schematics')), '..')
  } catch (error) {
    setupPnp(cwd)

    // eslint-disable-next-line
    return join(dirname(dynamicRequire.resolve('@atls/schematics')), '..')
  }
}
