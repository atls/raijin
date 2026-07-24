// @ts-check

import { dirname } from 'node:path'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pathToFileURL } from 'node:url'

import { cleanPackageBuild } from './clean.js'
import { buildLibraryArtifact } from './library.js'
import { buildProjectGenerationArtifact } from './project-generation.js'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

/**
 * @param {{ packageRoot?: string }} [options]
 * @returns {Promise<void>}
 */
export const buildPackageArtifact = async ({ packageRoot: root = packageRoot } = {}) => {
  await cleanPackageBuild({ packageRoot: root })
  await buildLibraryArtifact({ packageRoot: root })
  await buildProjectGenerationArtifact({ packageRoot: root })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await buildPackageArtifact()
}
