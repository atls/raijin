import assert                   from 'node:assert/strict'
import { test }                 from 'node:test'

import { Cli }                  from 'clipanion'

import { GenerateIconsCommand } from './icons.js'

const createCli = (): Cli => {
  const cli = new Cli({
    binaryLabel: 'Yarn',
    binaryName: 'yarn',
    binaryVersion: '0.0.0',
  })

  cli.register(GenerateIconsCommand)

  return cli
}

test('should expose the ui icons generate route and parse the native option', () => {
  const command = createCli().process(['ui', 'icons', 'generate', '--native'])

  assert.deepEqual(GenerateIconsCommand.paths, [['ui', 'icons', 'generate']])
  assert.ok(command instanceof GenerateIconsCommand)
  assert.equal(command.native, true)
})
