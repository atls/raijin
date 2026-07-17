/* eslint-disable no-console */

import type { Plugin }                     from 'esbuild'

import { cp }                              from 'node:fs/promises'
import { mkdir }                           from 'node:fs/promises'
import { rm }                              from 'node:fs/promises'
import { writeFile }                       from 'node:fs/promises'
import { join }                            from 'node:path'
import { resolve }                         from 'node:path'

import { pnpPlugin }                       from '@yarnpkg/esbuild-plugin-pnp'
import esbuild                             from 'esbuild'

import { getProjectGenerationArtifactDir } from '../installation.js'

const sourceExtensionPlugin: Plugin = {
  name: 'raijin-source-extension',
  setup: (build) => {
    build.onResolve({ filter: /^\.\.?\/.*\.js$/ }, ({ path, resolveDir }) => ({
      path: resolve(resolveDir, path.replace(/\.js$/, '.ts')),
    }))
  },
}

export const buildProjectGenerationArtifact = async (): Promise<void> => {
  const artifactDir = getProjectGenerationArtifactDir()
  const collectionDir = join(import.meta.dirname, 'collection')
  const result = await esbuild.build({
    entryPoints: [join(import.meta.dirname, 'index.ts')],
    bundle: true,
    write: false,
    format: 'cjs',
    platform: 'node',
    target: 'esnext',
    external: ['node:*'],
    plugins: [sourceExtensionPlugin, pnpPlugin()],
    logLevel: 'error',
  })
  const factory = result.outputFiles.at(0)

  if (!factory) {
    throw new Error('Project generation artifact build produced no output')
  }

  await rm(artifactDir, { recursive: true, force: true })
  await cp(collectionDir, artifactDir, { recursive: true })
  await mkdir(join(artifactDir, 'project'), { recursive: true })
  await writeFile(join(artifactDir, 'project/project.factory.cjs'), factory.contents)
}

try {
  await buildProjectGenerationArtifact()
  console.info('Project generation artifact build succeeded')
} catch (error) {
  console.error('Project generation artifact build failed')
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
