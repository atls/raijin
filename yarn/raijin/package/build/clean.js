// @ts-check

import { rm } from 'node:fs/promises'
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
export const cleanPackageBuild = async ({ packageRoot: root = packageRoot } = {}) => {
  await rm(join(root, 'dist'), { recursive: true, force: true })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await cleanPackageBuild()
}
