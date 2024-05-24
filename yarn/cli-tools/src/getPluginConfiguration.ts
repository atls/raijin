/* eslint-disable @typescript-eslint/no-unsafe-call */

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const { getDynamicLibs } = require('@yarnpkg/cli')

// eslint-disable-next-line  @typescript-eslint/explicit-function-return-type
module.exports.getPluginConfiguration = async (bundles = []) => {
  const plugins = new Set()
  for (const dependencyName of bundles) plugins.add(dependencyName)

  const modules = getDynamicLibs()

  for (const plugin of plugins) {
    // @ts-expect-error
    modules.set(plugin, (await import(plugin)).default) // eslint-disable-line no-await-in-loop
  }

  return { plugins, modules }
}
