import { createRequire } from 'node:module'
import { dirname }       from 'node:path'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)

const PACKAGE_NAME = '@atls/schematics'

const findPnpApiPath = (cwd = process.cwd()) => {
  if (process.versions.pnp) {
    return require('module')
      .findPnpApi(fileURLToPath(import.meta.url))
      .resolveRequest('pnpapi', null)
  }

  return join(cwd, '.pnp.cjs')
}

const setupPnp = async (cwd = process.cwd()) => {
  const pnpPath = findPnpApiPath(cwd)
  const { default: pnp } = await import(pnpPath)
  pnp.setup()
}

export const resolveSchematics = async (cwd = process.cwd()) => {
  try {
    return join(dirname(require.resolve(PACKAGE_NAME)), '..')
  } catch {
    await setupPnp(cwd)
    return join(dirname(require.resolve(PACKAGE_NAME)), '..')
  }
}

export const getCollectionPath = async (): Promise<string> => {
  const packagePath = await resolveSchematics(process.cwd())
  const collectionPath = join(packagePath, 'dist', 'collection.json')
  return collectionPath
}
