import type { ProjectInvocation } from '@atls/raijin/commands'

import assert                     from 'node:assert/strict'
import test                       from 'node:test'

import { CheckCommand }           from './check.command.js'

const runCheckCommand = async (
  targets: Array<string>,
  exitCodes: Array<number> = [0, 0, 0],
  invocationCwd = '/repo'
): Promise<{ exitCode: number; commands: Array<Array<string>> }> => {
  const commands: Array<Array<string>> = []
  const command = Object.assign(Object.create(CheckCommand.prototype), {
    targets,
    context: { cwd: '/repo' },
  }) as CheckCommand
  const invocation = {
    executionCwd: '/repo',
    invocationCwd,
    yarn: {
      execute: async (args: Array<string>) => {
        commands.push(args)

        return exitCodes[commands.length - 1] ?? 0
      },
    },
  } as unknown as ProjectInvocation

  const exitCode = await command.executeProject(invocation)

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

test('should serialize nested workspace targets from the project execution cwd', async () => {
  const { commands } = await runCheckCommand(['src/index.ts'], undefined, '/repo/packages/app')

  assert.deepEqual(commands, [
    ['format', 'packages/app/src/index.ts'],
    ['typecheck', 'packages/app/src/index.ts'],
    ['lint', 'packages/app/src/index.ts'],
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
