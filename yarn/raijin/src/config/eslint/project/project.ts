import type { Linter }                      from 'eslint'

import type { EslintProjectOptions }        from './project.interfaces.js'
import type { ResolveEslintProjectOptions } from './project.interfaces.js'

import { readFile }                         from 'node:fs/promises'
import { join }                             from 'node:path'

import { hasTypeScriptProject }             from '../../typescript/index.js'
import defaults                             from '../defaults/index.js'

const withTypeScriptRoot = (
  config: ReadonlyArray<Linter.Config>,
  tsconfigRootCwd: string
): Array<Linter.Config> =>
  config.map((item) => ({
    ...item,
    languageOptions: {
      ...item.languageOptions,
      parserOptions: {
        ...item.languageOptions?.parserOptions,
        tsconfigRootDir: tsconfigRootCwd,
      },
    },
  }))

export const resolveEslintProjectIgnorePatterns = async (cwd: string): Promise<Array<string>> => {
  const content = await readFile(join(cwd, 'package.json'), 'utf8')
  const manifest = JSON.parse(content) as { linterIgnorePatterns?: Array<string> }

  return manifest.linterIgnorePatterns ?? []
}

export const resolveEslintProject = async ({
  cache = false,
  cacheLocation,
  cwd,
  eslint: ESLint,
  fix = false,
  rootCwd,
}: ResolveEslintProjectOptions): Promise<EslintProjectOptions> => {
  const tsconfigRootCwd = hasTypeScriptProject(cwd) ? cwd : rootCwd
  const configFile = await new ESLint({ cwd }).findConfigFile()

  return {
    baseConfig: withTypeScriptRoot(defaults, tsconfigRootCwd),
    cache,
    ...(cacheLocation ? { cacheLocation } : {}),
    cwd,
    fix,
    ...(!configFile ? { overrideConfigFile: true } : {}),
  }
}
