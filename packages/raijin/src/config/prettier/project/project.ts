import type { Config }                        from 'prettier'
import type { Plugin }                        from 'prettier'

import type { PrettierProjectConfig }         from './project.interfaces.js'
import type { ResolvePrettierProjectOptions } from './project.interfaces.js'

import { readFile }                           from 'node:fs/promises'
import { createRequire }                      from 'node:module'
import { join }                               from 'node:path'
import { pathToFileURL }                      from 'node:url'

import { resolveConfig }                      from 'prettier'
import { resolveConfigFile }                  from 'prettier'

import { createPrettierDefaults }             from '../defaults.js'

const mergePlugins = (defaults: Config['plugins'], project: Config['plugins']): Config['plugins'] =>
  Array.from(new Set([...(defaults ?? []), ...(project ?? [])]))

const loadPlugin = async (specifier: string, filepath: string): Promise<Plugin> => {
  const configFile = await resolveConfigFile(filepath)
  const require = createRequire(configFile ?? filepath)
  const importedPlugin = (await import(
    pathToFileURL(require.resolve(specifier)).href
  )) as Plugin & {
    default?: Plugin
  }

  return importedPlugin.default ?? importedPlugin
}

const loadPlugins = async (
  plugins: Config['plugins'],
  filepath: string
): Promise<Config['plugins']> =>
  Promise.all(
    (plugins ?? []).map(async (plugin) =>
      typeof plugin === 'string' ? loadPlugin(plugin, filepath) : plugin)
  )

export const resolvePrettierProjectIgnorePatterns = async (cwd: string): Promise<Array<string>> => {
  const content = await readFile(join(cwd, 'package.json'), 'utf8')
  const manifest = JSON.parse(content) as { formatterIgnorePatterns?: Array<string> }

  return manifest.formatterIgnorePatterns ?? []
}

export const resolvePrettierProject = async ({
  filepath,
  plugin,
}: ResolvePrettierProjectOptions): Promise<PrettierProjectConfig> => {
  const defaults = await createPrettierDefaults(plugin)
  const project = await resolveConfig(filepath)

  if (!project) {
    return defaults
  }

  return {
    ...defaults,
    ...project,
    plugins: mergePlugins(defaults.plugins, await loadPlugins(project.plugins, filepath)),
  }
}
