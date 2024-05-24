import * as nodeUtils    from '@yarnpkg/pnp/lib/loader/nodeUtils.js'

import { createRequire } from 'node:module'
import { extname }       from 'node:path'

const require = createRequire(import.meta.url)

export const getFileFormat = (filepath: string): string | null => {
  const ext = extname(filepath)

  switch (ext) {
    case '.mts': {
      return 'module'
    }
    case '.cts': {
      return 'commonjs'
    }
    case '.ts': {
      const pkg = nodeUtils.readPackageScope(filepath)
      if (!pkg) return 'commonjs'
      return pkg.data.type ?? 'commonjs'
    }
    case '.tsx': {
      const pkg = nodeUtils.readPackageScope(filepath)
      if (!pkg) return 'commonjs'
      return pkg.data.type ?? 'commonjs'
    }
    default: {
      return null
    }
  }
}

export const transformSource = (source: string, format: string, ext: 'ts' | 'tsx'): string => {
  const { transformSync } = require('esbuild')

  const { code } = transformSync(source, {
    format: format === 'module' ? 'esm' : 'cjs',
    loader: ext === 'tsx' ? 'tsx' : 'ts',
    target: `node${process.versions.node}`,
  })

  return code
}
