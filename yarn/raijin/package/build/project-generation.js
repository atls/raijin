// @ts-check

import { dirname } from 'node:path'
import { join } from 'node:path'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pathToFileURL } from 'node:url'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
/**
 * @param {{ packageRoot?: string }} [options]
 * @returns {Promise<void>}
 */
export const buildProjectGenerationArtifact = async ({ packageRoot: root = packageRoot } = {}) => {
  const buildModulePath = join(
    root,
    'dist/infrastructure/generation/project/angular/artifact/build.js'
  )
  const { buildCollection } = await import(pathToFileURL(buildModulePath).href)

  await buildCollection({ packageRoot: root })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await buildProjectGenerationArtifact()
}
