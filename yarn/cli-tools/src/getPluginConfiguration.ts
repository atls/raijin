/* eslint-disable @typescript-eslint/no-unsafe-call */

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const { getDynamicLibs } = require('@yarnpkg/cli')

module.exports.getPluginConfiguration = async (
  bundles: Array<string> = []
): Promise<{ plugins: Set<string>; modules: Map<string, unknown> }> => {
  const plugins = new Set<string>()

  for (const dependencyName of bundles) plugins.add(dependencyName)

  const modules: Map<string, unknown> = getDynamicLibs()

  for await (const plugin of plugins) {
    modules.set(plugin, (await import(plugin)).default)
  }

  return { plugins, modules }
}
