import { cp }            from 'node:fs/promises'
import { rm }            from 'node:fs/promises'
import { resolve }       from 'node:path'
import { join }          from 'node:path'
import { pathToFileURL } from 'node:url'

import { pnpPlugin }     from '@yarnpkg/esbuild-plugin-pnp'
import esbuild           from 'esbuild'

export const buildProjectCollection = async ({
  packageRoot = resolve(import.meta.dirname, '../../..'),
}: {
  packageRoot?: string
} = {}): Promise<void> => {
  const sourceRoot = join(packageRoot, 'src/infrastructure/generation/project/angular/collection')
  const outputRoot = join(packageRoot, 'dist/generation/project/collection')
  const sourceFactory = join(sourceRoot, 'project/factory.ts')
  const outputFactory = join(outputRoot, 'project/project.factory.cjs')

  await rm(outputRoot, { recursive: true, force: true })
  await cp(sourceRoot, outputRoot, { recursive: true })
  await esbuild.build({
    bundle: true,
    entryPoints: [sourceFactory],
    external: ['node:*'],
    format: 'cjs',
    logLevel: 'error',
    outfile: outputFactory,
    platform: 'node',
    plugins: [pnpPlugin()],
    sourcemap: false,
    target: 'node24',
  })
  await rm(join(outputRoot, 'project/factory.ts'))
}

const entrypoint = process.argv[1]

if (entrypoint && import.meta.url === pathToFileURL(resolve(entrypoint)).href) {
  await buildProjectCollection()
}
