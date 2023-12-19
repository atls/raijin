import { dirname } from 'node:path'
import { join }    from 'node:path'

const dynamicRequire = eval('require') // eslint-disable-line no-eval

const findPnpApiPath = (cwd?: string) => {
  if (process.versions.pnp) {
    return require('module').findPnpApi(__filename).resolveRequest('pnpapi', null)
  }

  return join(cwd || process.cwd(), '.pnp.cjs')
}

const setupPnp = (cwd?: string) => {
  const pnpPath = findPnpApiPath(cwd)

  dynamicRequire(pnpPath).setup()
}

export const resolveSchematics = (cwd?: string) => {
  try {
    return join(dirname(dynamicRequire.resolve('@atls/schematics')), '..')
  } catch (error) {
    setupPnp(cwd)

    return join(dirname(dynamicRequire.resolve('@atls/schematics')), '..')
  }
}
