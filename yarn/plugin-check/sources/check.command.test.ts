import assert           from 'node:assert/strict'
import test             from 'node:test'

import { CheckCommand } from './check.command.js'

const runCheckCommand = async (
  targets: Array<string>,
  exitCodes: Array<number> = [0, 0, 0]
): Promise<{ exitCode: number; commands: Array<Array<string>> }> => {
  const commands: Array<Array<string>> = []
  const command = Object.assign(Object.create(CheckCommand.prototype), {
    targets,
    context: { cwd: '/repo' },
    cli: {
      run: async (args: Array<string>) => {
        commands.push(args)

        return exitCodes[commands.length - 1] ?? 0
      },
    },
  }) as CheckCommand

  const exitCode = await command.execute()

  return { exitCode, commands }
}

test('should run full check sequence without explicit targets', async () => {
  const { exitCode, commands } = await runCheckCommand([])

  assert.equal(exitCode, 0)
  assert.deepEqual(commands, [['format'], ['typecheck'], ['lint']])
})

test('should forward explicit targets to every check command', async () => {
  const { exitCode, commands } = await runCheckCommand(['yarn/plugin-check/sources'])

  assert.equal(exitCode, 0)
  assert.deepEqual(commands, [
    ['format', 'yarn/plugin-check/sources'],
    ['typecheck', 'yarn/plugin-check/sources'],
    ['lint', 'yarn/plugin-check/sources'],
  ])
})

test('should serialize normalized targets from the invocation cwd', async () => {
  const { commands } = await runCheckCommand(['/repo/yarn/plugin-check/sources'])

  assert.deepEqual(commands, [
    ['format', 'yarn/plugin-check/sources'],
    ['typecheck', 'yarn/plugin-check/sources'],
    ['lint', 'yarn/plugin-check/sources'],
  ])
})

test('should preserve non-zero exit code after running every check command', async () => {
  const { exitCode, commands } = await runCheckCommand(['yarn/plugin-check/sources'], [0, 1, 0])

  assert.equal(exitCode, 1)
  assert.deepEqual(commands, [
    ['format', 'yarn/plugin-check/sources'],
    ['typecheck', 'yarn/plugin-check/sources'],
    ['lint', 'yarn/plugin-check/sources'],
  ])
})
