import type { PluginConfiguration }  from '@yarnpkg/core'

import assert                        from 'node:assert/strict'
import { test }                      from 'node:test'

import { Cli }                       from 'clipanion'

import { composeCommandInvocations } from '@atls/raijin/commands'

import { TestUnitCommand }           from '../command.js'
import { plugin }                    from '../plugin.js'

const createCli = (): Cli => {
  const configuration: PluginConfiguration = {
    modules: new Map([['@atls/yarn-plugin-test', plugin]]),
    plugins: new Set(['@atls/yarn-plugin-test']),
  }

  composeCommandInvocations(configuration)

  const cli = new Cli({
    binaryLabel: 'Yarn',
    binaryName: 'yarn',
    binaryVersion: '0.0.0',
  })

  for (const CommandClass of plugin.commands ?? []) {
    cli.register(CommandClass)
  }

  return cli
}

test('registers only the three public test commands', () => {
  assert.deepEqual(
    (plugin.commands ?? [])
      .flatMap((CommandClass) => CommandClass.paths ?? [])
      .map((path) => path.join(' '))
      .sort(),
    ['test', 'test integration', 'test unit']
  )
})

test('parses scenario options and targets', () => {
  const command = createCli().process([
    'test',
    'unit',
    '--target',
    'packages/app',
    '--watch',
    '--test-reporter',
    'tap',
    'button',
  ])

  assert.ok(command instanceof TestUnitCommand)
  assert.equal(command.target, 'packages/app')
  assert.equal(command.watch, true)
  assert.equal(command.testReporter, 'tap')
  assert.deepEqual(command.files, ['button'])
})
