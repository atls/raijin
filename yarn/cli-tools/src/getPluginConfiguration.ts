const { getDynamicLibs } = require('@yarnpkg/cli')

module.exports.getPluginConfiguration = async (bundles = []) => {
  const plugins = new Set()
  for (const dependencyName of bundles) plugins.add(dependencyName)

  const modules = getDynamicLibs()

  for (const plugin of plugins) {
    // @ts-ignore
    modules.set(plugin, (await import(plugin)).default) // eslint-disable-line no-await-in-loop
  }

  return { plugins, modules }
}
