import { createRequire }              from 'node:module'
import { extname }                    from 'node:path'

import * as nodeUtils                 from '@yarnpkg/pnp/lib/loader/nodeUtils.js'

import { getFileFormatByPackageType } from './loader.format.js'
import { isPnpPackageSource }         from './loader.format.js'

const require = createRequire(import.meta.url)

export const getFileFormat = (filepath: string): 'module' | null => {
  const ext = extname(filepath)

  const pkg = ext === '.ts' || ext === '.tsx' ? nodeUtils.readPackageScope(filepath) : undefined
  const packageType = pkg ? (pkg.data.type as string | undefined) : undefined

  return getFileFormatByPackageType(ext, packageType, isPnpPackageSource(filepath))
}

export const transformSource = (source: string, format: 'module', ext: 'ts' | 'tsx'): string => {
  const { transformSync } = require('esbuild')

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, n/no-sync
  const { code } = transformSync(source, {
    format: 'esm',
    loader: ext === 'tsx' ? 'tsx' : 'ts',
    target: `node${process.versions.node}`,
  })

  return code as string
}
