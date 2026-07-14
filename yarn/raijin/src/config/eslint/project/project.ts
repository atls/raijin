import type { Linter }                      from 'eslint'

import type { EslintProjectOptions }        from './project.interfaces.js'
import type { ResolveEslintProjectOptions } from './project.interfaces.js'

import { stat }                             from 'node:fs/promises'
import { readFile }                         from 'node:fs/promises'
import { join }                             from 'node:path'
import { pathToFileURL }                    from 'node:url'

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

const loadProjectConfig = async (
  configFile: string | undefined
): Promise<Array<Linter.Config> | Linter.Config | undefined> => {
  if (!configFile) {
    return undefined
  }

  const { mtimeMs } = await stat(configFile)
  const url = pathToFileURL(configFile)

  url.searchParams.set('mtime', String(mtimeMs))

  const importedConfig = (await import(url.href)) as {
    default?: Array<Linter.Config> | Linter.Config
  }

  return importedConfig.default
}

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
  const projectConfig = await loadProjectConfig(configFile)

  return {
    baseConfig: withTypeScriptRoot(defaults, tsconfigRootCwd),
    cache,
    ...(cacheLocation ? { cacheLocation } : {}),
    cwd,
    fix,
    ...(projectConfig ? { overrideConfig: projectConfig } : {}),
    overrideConfigFile: true,
  }
}
