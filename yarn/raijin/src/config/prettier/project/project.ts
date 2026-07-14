import type { Config }                        from 'prettier'

import type { PrettierProjectConfig }         from './project.interfaces.js'
import type { ResolvePrettierProjectOptions } from './project.interfaces.js'

import { readFile }                           from 'node:fs/promises'
import { join }                               from 'node:path'

import { resolveConfig }                      from 'prettier'

import { createPrettierDefaults }             from '../defaults.js'

const mergePlugins = (defaults: Config['plugins'], project: Config['plugins']): Config['plugins'] =>
  Array.from(new Set([...(defaults ?? []), ...(project ?? [])]))

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
    plugins: mergePlugins(defaults.plugins, project.plugins),
  }
}
