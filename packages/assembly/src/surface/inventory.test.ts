/* eslint-disable max-classes-per-file */

import type { Plugin }                from '@yarnpkg/core'

import assert                         from 'node:assert/strict'
import test                           from 'node:test'

import { BaseCommand }                from '@yarnpkg/cli'
import { Cli }                        from 'clipanion'
import { Command }                    from 'clipanion'

import { collectCliSurfaceInventory } from './inventory.js'

class AlphaCommand extends BaseCommand {
  static override paths = [['alpha']]

  static override usage = Command.Usage({
    description: 'run alpha',
    details: 'Alpha details.',
    examples: [['Alpha example', 'yarn alpha']],
  })

  async execute(): Promise<number> {
    return 0
  }
}

class ZetaCommand extends BaseCommand {
  static override paths = [['zeta']]

  static override usage = Command.Usage({
    description: 'run zeta',
  })

  async execute(): Promise<number> {
    return 0
  }
}

class HiddenCommand extends BaseCommand {
  static override paths = [['hidden']]

  async execute(): Promise<number> {
    return 0
  }
}

const createPlugins = (commands: Array<typeof AlphaCommand>): Map<string, Plugin> =>
  new Map([
    ['@atls/yarn-plugin-test-surface', { commands }],
    ['@yarnpkg/plugin-external', {}],
  ])

test('collects deterministic metadata from the registered plugin objects', () => {
  const plugins = createPlugins([ZetaCommand, AlphaCommand])
  const cli = Cli.from([ZetaCommand, AlphaCommand], {
    binaryName: 'yarn',
    enableColors: false,
  })

  const inventory = collectCliSurfaceInventory({ cli, plugins })

  assert.deepEqual(inventory.plugins, [
    '@atls/yarn-plugin-test-surface',
    '@yarnpkg/plugin-external',
  ])
  assert.deepEqual(
    inventory.commands.map(({ command, description, plugin }) => ({
      command,
      description,
      plugin,
    })),
    [
      {
        command: 'alpha',
        description: 'run alpha',
        plugin: '@atls/yarn-plugin-test-surface',
      },
      {
        command: 'zeta',
        description: 'run zeta',
        plugin: '@atls/yarn-plugin-test-surface',
      },
    ]
  )
  assert.deepEqual(inventory.commands[0].examples, [
    {
      command: 'yarn alpha',
      description: 'Alpha example',
    },
  ])
})

test('rejects a registered Raijin command hidden from general help', () => {
  const plugins = createPlugins([HiddenCommand as typeof AlphaCommand])
  const cli = Cli.from([HiddenCommand], {
    binaryName: 'yarn',
    enableColors: false,
  })

  assert.throws(
    () => collectCliSurfaceInventory({ cli, plugins }),
    /must define Clipanion usage metadata/
  )
})

test('rejects a route registered by more than one plugin owner', () => {
  class DuplicateAlphaCommand extends BaseCommand {
    static override paths = [['alpha']]

    static override usage = Command.Usage({
      description: 'duplicate alpha',
    })

    async execute(): Promise<number> {
      return 0
    }
  }

  const plugins = new Map<string, Plugin>([
    ['@atls/yarn-plugin-alpha', { commands: [AlphaCommand] }],
    ['@atls/yarn-plugin-duplicate', { commands: [DuplicateAlphaCommand] }],
  ])
  const cli = Cli.from([AlphaCommand, DuplicateAlphaCommand], {
    binaryName: 'yarn',
    enableColors: false,
  })

  assert.throws(
    () => collectCliSurfaceInventory({ cli, plugins }),
    /is registered by both @atls\/yarn-plugin-alpha and @atls\/yarn-plugin-duplicate/
  )
})
