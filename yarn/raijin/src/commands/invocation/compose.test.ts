/* eslint-disable max-classes-per-file */

import type { CommandContext }                from '@yarnpkg/core'

import type { WorkspaceInvocation }           from './resolve.interfaces.js'

import assert                                 from 'node:assert/strict'
import { dirname }                            from 'node:path'
import { before }                             from 'node:test'
import test                                   from 'node:test'
import { fileURLToPath }                      from 'node:url'

import { Configuration }                      from '@yarnpkg/core'
import { Project }                            from '@yarnpkg/core'
import { getPluginConfiguration }             from '@yarnpkg/cli'
import { npath }                              from '@yarnpkg/fslib'
import { ppath }                              from '@yarnpkg/fslib'

import { composeCommandClass }                from './compose.js'
import { composePluginConfigurationCommands } from './compose.js'
import { defineCommandInvocation }            from './definition.js'

const testCwd = npath.toPortablePath(dirname(fileURLToPath(import.meta.url)))

let repoRoot = testCwd
let rendererNestedCwd = testCwd

before(async () => {
  const configuration = await Configuration.find(testCwd, getPluginConfiguration())
  const { project } = await Project.find(configuration, testCwd)

  repoRoot = project.cwd
  rendererNestedCwd = ppath.join(project.cwd, 'yarn/plugin-renderer/sources/commands')
})

test('should leave commands without an invocation definition unchanged', () => {
  class PlainCommand {
    context!: CommandContext

    async execute(): Promise<number> {
      return 0
    }
  }

  assert.equal(composeCommandClass(PlainCommand), PlainCommand)
})

test('should inject a workspace invocation before command execution', async () => {
  let invocation: WorkspaceInvocation | undefined

  class WorkspaceCommand {
    static raijinCommand = defineCommandInvocation({ scope: 'workspace' })

    context!: CommandContext

    async execute(commandInvocation?: WorkspaceInvocation): Promise<number> {
      invocation = commandInvocation

      return 7
    }
  }

  const ComposedCommand = composeCommandClass(WorkspaceCommand)
  const command = new ComposedCommand()

  command.context = {
    cwd: rendererNestedCwd,
    plugins: getPluginConfiguration(),
  } as CommandContext

  const previousProjectRuntime = process.env.RAIJIN_PROJECT_RUNTIME
  const previousNodeOptions = process.env.NODE_OPTIONS
  const pnpCjsPath = npath.join(npath.fromPortablePath(repoRoot), '.pnp.cjs')

  process.env.RAIJIN_PROJECT_RUNTIME = npath.fromPortablePath(repoRoot)
  process.env.NODE_OPTIONS = [previousNodeOptions, '--require', pnpCjsPath]
    .filter(Boolean)
    .join(' ')

  try {
    assert.equal(await (command.execute as () => Promise<number>)(), 7)
  } finally {
    if (previousProjectRuntime) {
      process.env.RAIJIN_PROJECT_RUNTIME = previousProjectRuntime
    } else {
      Reflect.deleteProperty(process.env, 'RAIJIN_PROJECT_RUNTIME')
    }

    if (previousNodeOptions) {
      process.env.NODE_OPTIONS = previousNodeOptions
    } else {
      Reflect.deleteProperty(process.env, 'NODE_OPTIONS')
    }
  }

  assert.ok(invocation)
  assert.equal(invocation.invocationCwd, rendererNestedCwd)
  assert.equal(invocation.executionCwd, ppath.join(rendererNestedCwd, '../..'))
  assert.equal(invocation.workspace.manifest.raw.name, '@atls/yarn-plugin-renderer')
})

test('should not wrap an already composed command class again', () => {
  class WorkspaceCommand {
    static raijinCommand = defineCommandInvocation({ scope: 'workspace' })

    context!: CommandContext

    async execute(): Promise<number> {
      return 0
    }
  }

  const ComposedCommand = composeCommandClass(WorkspaceCommand)

  assert.equal(composeCommandClass(ComposedCommand), ComposedCommand)
})

test('should compose only Raijin plugin commands in a plugin configuration', () => {
  class WorkspaceCommand {
    static raijinCommand = defineCommandInvocation({ scope: 'workspace' })

    context!: CommandContext

    async execute(): Promise<number> {
      return 0
    }
  }

  class ExternalCommand {
    static raijinCommand = defineCommandInvocation({ scope: 'workspace' })

    context!: CommandContext

    async execute(): Promise<number> {
      return 0
    }
  }

  const raijinPlugin = { commands: [WorkspaceCommand] }
  const yarnPlugin = { commands: [ExternalCommand] }
  const pluginConfiguration = {
    modules: new Map<string, unknown>([
      ['@atls/yarn-plugin-test', raijinPlugin],
      ['@yarnpkg/plugin-test', yarnPlugin],
    ]),
    plugins: new Set(['@atls/yarn-plugin-test', '@yarnpkg/plugin-test']),
  }

  composePluginConfigurationCommands(pluginConfiguration)

  const composedRaijinPlugin = pluginConfiguration.modules.get('@atls/yarn-plugin-test') as {
    commands: Array<typeof WorkspaceCommand>
  }
  const composedYarnPlugin = pluginConfiguration.modules.get('@yarnpkg/plugin-test') as {
    commands: Array<typeof ExternalCommand>
  }

  assert.notEqual(composedRaijinPlugin.commands[0], WorkspaceCommand)
  assert.equal(composedYarnPlugin.commands[0], ExternalCommand)
  assert.equal(pluginConfiguration.plugins.has('@atls/yarn-plugin-test'), true)
  assert.equal(composedRaijinPlugin, raijinPlugin)
  assert.equal(pluginConfiguration.plugins.has('@yarnpkg/plugin-test'), true)
})

test('should compose commands inside bundled namespace plugin modules', () => {
  class WorkspaceCommand {
    static raijinCommand = defineCommandInvocation({ scope: 'workspace' })

    context!: CommandContext

    async execute(): Promise<number> {
      return 0
    }
  }

  const raijinPlugin = { commands: [WorkspaceCommand] }
  const pluginModule = { default: raijinPlugin }
  const pluginConfiguration = {
    modules: new Map<string, unknown>([['@atls/yarn-plugin-test', pluginModule]]),
    plugins: new Set(['@atls/yarn-plugin-test']),
  }

  composePluginConfigurationCommands(pluginConfiguration)

  assert.equal(pluginModule.default, raijinPlugin)
  assert.notEqual(raijinPlugin.commands[0], WorkspaceCommand)
})
