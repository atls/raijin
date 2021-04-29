import { Plugin } from '@yarnpkg/core'

export const mergePlugins = (plugins: Array<Plugin>): Plugin => {
  let commands = []
  const hooks = {}
  const hooksByName = new Map()

  // eslint-disable-next-line no-restricted-syntax
  for (const plugin of plugins) {
    if (plugin.commands) {
      // @ts-ignore
      commands = [...commands, ...plugin.commands]
    }

    if (plugin.hooks) {
      Object.keys(plugin.hooks).forEach((hook) => {
        if (!hooksByName.has(hook)) {
          hooksByName.set(hook, [])
        }

        hooksByName.get(hook).push(plugin.hooks[hook])
      })
    }
  }

  // eslint-disable-next-line no-restricted-syntax
  for (const [hook, handlers] of hooksByName) {
    hooks[hook] = (...args) => Promise.all(handlers.map((handler) => handler(...args)))
  }

  return {
    commands,
    hooks,
  }
}
