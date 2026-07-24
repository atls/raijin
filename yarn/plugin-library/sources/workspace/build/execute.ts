import type { ts as typescript }             from '@atls/raijin/typescript'

import type { BuildLibraryWorkspaceOptions } from './execute.interfaces.js'

import { rm }                                from 'node:fs/promises'
import { join }                              from 'node:path'

import { TypeScript }                        from '@atls/code-typescript'

const DEFAULT_TARGET = './dist'
const SOURCE_DIRECTORY = './src'

export const buildLibraryWorkspace = async ({
  cwd,
  target = DEFAULT_TARGET,
  typescript: providedTypeScript,
}: BuildLibraryWorkspaceOptions): Promise<Array<typescript.Diagnostic>> => {
  await rm(join(cwd, target), { recursive: true, force: true })

  const workspaceTypeScript = providedTypeScript ?? (await TypeScript.initialize(cwd))

  return workspaceTypeScript.build([join(cwd, SOURCE_DIRECTORY)], {
    declaration: true,
    outDir: join(cwd, target),
    rootDir: join(cwd, SOURCE_DIRECTORY),
  })
}
