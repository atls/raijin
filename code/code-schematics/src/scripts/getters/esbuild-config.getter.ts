import type { BuildOptions } from 'esbuild'
import type { Format }       from 'esbuild'
import type { Platform }     from 'esbuild'
import type { LogLevel }     from 'esbuild'

import { resolve }           from 'node:path'

import { pnpPlugin }         from '@yarnpkg/esbuild-plugin-pnp'

export const getEsbuildConfig = (): BuildOptions => {
  const esbuildConfig = {
    logLevel: 'error' as LogLevel,
    entryPoints: ['src/schematic/index.ts'],
    bundle: true,
    write: false,
    format: 'cjs' as Format,
    platform: 'node' as Platform,
    sourcemap: false,
    target: 'esnext',
    external: ['node:*', '@atls/code-runtime'],
    plugins: [
      pnpPlugin({
        onResolve: async (args) => {
          if (args.path.includes('.ts')) {
            return {
              path: resolve(args.resolveDir, args.path.replace(/\.js/, '')),
              external: false,
            }
          }
          return {
            namespace: args.path,
            external: false,
          }
        },
      }),
    ],
  }

  return esbuildConfig
}
