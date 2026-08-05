import type { Plugin }               from '@yarnpkg/core'
import type { PluginConfiguration }  from '@yarnpkg/core'
import type { PortablePath }         from '@yarnpkg/fslib'

import type { EntryCommandContext }  from '../definition.interfaces.js'

import assert                        from 'node:assert/strict'
import { PassThrough }               from 'node:stream'
import test                          from 'node:test'

import { BaseCommand }               from '@yarnpkg/cli'
import { npath }                     from '@yarnpkg/fslib'

import { composeCommandInvocations } from '../compose.js'
import { defineCommandInvocations }  from '../definition.js'

let resolvedInvocationCwd: PortablePath | undefined

class EntryCommand extends BaseCommand {
  static override paths = [['entry']]

  declare context: EntryCommandContext

  override async execute(): Promise<number> {
    resolvedInvocationCwd = this.context.invocation.invocationCwd

    return 7
  }
}

test('should compose a registered command without replacing its static contract', async () => {
  const plugin: Plugin = {
    commands: defineCommandInvocations({ entry: [EntryCommand] }),
  }
  const configuration: PluginConfiguration = {
    modules: new Map([['@atls/yarn-plugin-entry', plugin]]),
    plugins: new Set(['@atls/yarn-plugin-entry']),
  }

  composeCommandInvocations(configuration)

  const [CommandClass] = plugin.commands ?? []

  assert.ok(CommandClass)
  assert.notEqual(CommandClass, EntryCommand)
  assert.deepEqual(CommandClass.paths, EntryCommand.paths)

  const command = new CommandClass()

  command.context = {
    colorDepth: 8,
    cwd: npath.toPortablePath('/repo'),
    env: {},
    plugins: configuration,
    quiet: false,
    stderr: new PassThrough(),
    stdin: new PassThrough(),
    stdout: new PassThrough(),
  }

  assert.equal(await command.execute(), 7)
  assert.equal(resolvedInvocationCwd, '/repo')
})
