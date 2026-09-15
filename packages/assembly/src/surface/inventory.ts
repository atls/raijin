import type { CommandContext }      from '@yarnpkg/core'
import type { Plugin }              from '@yarnpkg/core'
import type { PluginConfiguration } from '@yarnpkg/core'
import type { PortablePath }        from '@yarnpkg/fslib'
import type { CommandClass }        from 'clipanion'
import type { Definition }          from 'clipanion'

import type { CliSurfaceCommand }   from './inventory.interfaces.js'
import type { CliSurfaceInventory } from './inventory.interfaces.js'

import { Configuration }            from '@yarnpkg/core'
import { getCli }                   from '@yarnpkg/cli'

interface CliMetadataSource {
  definition: (
    commandClass: CommandClass<CommandContext>,
    options: { colored: boolean }
  ) => Definition | null
}

interface CollectCliSurfaceInventoryOptions {
  cli: CliMetadataSource
  plugins: ReadonlyMap<string, Plugin>
}

interface CreateCliSurfaceInventoryOptions {
  cwd: PortablePath
  pluginConfiguration: PluginConfiguration
}

const normalizeText = (value: string | undefined): string | undefined => {
  const normalized = value?.trim()

  return normalized || undefined
}

const collectCommand = ({
  definition,
  pathTokens,
  plugin,
}: {
  definition: Definition
  pathTokens: Array<string>
  plugin: string
}): CliSurfaceCommand => {
  const description = normalizeText(definition.description)

  if (!description) {
    throw new Error(
      `Raijin command "${pathTokens.join(' ')}" from ${plugin} must define a usage description`
    )
  }

  const examples = (definition.examples ?? []).map(([exampleDescription, command]) => {
    const normalizedDescription = normalizeText(exampleDescription)

    if (!normalizedDescription) {
      throw new Error(
        `Raijin command "${pathTokens.join(' ')}" from ${plugin} has an example without a description`
      )
    }

    return {
      command,
      description: normalizedDescription,
    }
  })

  return {
    command: pathTokens.join(' '),
    description,
    ...(normalizeText(definition.details) ? { details: normalizeText(definition.details) } : {}),
    examples,
    options: definition.options.map((option) => ({
      definition: option.definition,
      ...(normalizeText(option.description)
        ? { description: normalizeText(option.description) }
        : {}),
      nameSet: [...option.nameSet],
      preferredName: option.preferredName,
      required: option.required,
    })),
    pathTokens,
    plugin,
    usage: definition.usage,
  }
}

export const collectCliSurfaceInventory = ({
  cli,
  plugins: registeredPlugins,
}: CollectCliSurfaceInventoryOptions): CliSurfaceInventory => {
  const commands: Array<CliSurfaceCommand> = []
  const routes = new Map<string, string>()
  const plugins = [...registeredPlugins.keys()].sort((left, right) => left.localeCompare(right))

  for (const pluginName of plugins) {
    const plugin = registeredPlugins.get(pluginName)

    if (!plugin)
      throw new Error(`CLI plugin ${pluginName} is registered without a Yarn Plugin object`)

    if (!pluginName.startsWith('@atls/')) continue

    for (const commandClass of plugin.commands ?? []) {
      const paths = commandClass.paths ?? []

      if (paths.length !== 1) {
        throw new Error(
          `Raijin command ${commandClass.name || '<anonymous>'} from ${pluginName} must own exactly one route`
        )
      }

      const pathTokens = paths[0]

      if (pathTokens.length === 0 || pathTokens.some((token) => token.length === 0)) {
        throw new Error(
          `Raijin command ${commandClass.name || '<anonymous>'} from ${pluginName} has an invalid route`
        )
      }

      const command = pathTokens.join(' ')
      const existingOwner = routes.get(command)

      if (existingOwner) {
        throw new Error(
          `Raijin route "${command}" is registered by both ${existingOwner} and ${pluginName}`
        )
      }

      const definition = cli.definition(commandClass, { colored: false })

      if (!definition) {
        throw new Error(
          `Raijin command "${command}" from ${pluginName} must define Clipanion usage metadata`
        )
      }

      routes.set(command, pluginName)
      commands.push(
        collectCommand({
          definition,
          pathTokens: [...pathTokens],
          plugin: pluginName,
        })
      )
    }
  }

  commands.sort((left, right) => {
    if (left.command !== right.command) return left.command.localeCompare(right.command)
    return left.plugin.localeCompare(right.plugin)
  })

  return {
    schemaVersion: 1,
    commands,
    plugins,
  }
}

export const createCliSurfaceInventory = async ({
  cwd,
  pluginConfiguration,
}: CreateCliSurfaceInventoryOptions): Promise<CliSurfaceInventory> => {
  const [cli, configuration] = await Promise.all([
    getCli({ cwd, pluginConfiguration }),
    Configuration.find(cwd, pluginConfiguration, {
      strict: false,
      usePathCheck: null,
      useRc: false,
    }),
  ])
  const bundledPlugins = new Map<string, Plugin>()

  for (const pluginName of pluginConfiguration.plugins) {
    const plugin = configuration.plugins.get(pluginName)

    if (!plugin) {
      throw new Error(`Bundled CLI plugin ${pluginName} was not resolved by Yarn Configuration`)
    }

    bundledPlugins.set(pluginName, plugin)
  }

  return collectCliSurfaceInventory({ cli, plugins: bundledPlugins })
}
