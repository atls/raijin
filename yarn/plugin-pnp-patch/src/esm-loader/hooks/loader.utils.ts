import { createRequire } from 'node:module'
import { extname }       from 'node:path'

import * as nodeUtils    from '@yarnpkg/pnp/lib/loader/nodeUtils.js'

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

      return (pkg.data.type as string) ?? 'commonjs'
    }
    case '.tsx': {
      const pkg = nodeUtils.readPackageScope(filepath)

      if (!pkg) return 'commonjs'

      return (pkg.data.type as string) ?? 'commonjs'
    }
    default: {
      return null
    }
  }
}

export const transformSource = (source: string, format: string, ext: 'ts' | 'tsx'): string => {
  // eslint-disable-next-line n/no-sync
  const { transformSync } = require('esbuild')

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, n/no-sync
  const { code } = transformSync(source, {
    format: format === 'module' ? 'esm' : 'cjs',
    loader: ext === 'tsx' ? 'tsx' : 'ts',
    target: `node${process.versions.node}`,
  })

  return code as string
}
