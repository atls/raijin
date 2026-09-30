/* eslint-disable @typescript-eslint/no-unsafe-call */

import type { PluginConfiguration } from '@yarnpkg/core'

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const { getDynamicLibs } = require('@yarnpkg/cli')

export const getPluginConfiguration = async (
  bundles: Array<string> = []
): Promise<PluginConfiguration> => {
  const plugins = new Set<string>()

  for (const dependencyName of bundles) plugins.add(dependencyName)

  const modules: Map<string, unknown> = getDynamicLibs()

  for await (const plugin of plugins) {
    modules.set(plugin, (await import(plugin)).default)
  }

  return { plugins, modules }
}
