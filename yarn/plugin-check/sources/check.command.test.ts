import type { WorkspaceInvocation } from '@atls/raijin/commands'

import assert                       from 'node:assert/strict'
import test                         from 'node:test'

import { CheckCommand }             from './check.command.js'

const runCheckCommand = async (
  targets: Array<string>,
  exitCodes: Array<number> = [0, 0, 0],
  invocationCwd = '/repo',
  executionCwd = invocationCwd
): Promise<{ exitCode: number; commands: Array<Array<string>> }> => {
  const commands: Array<Array<string>> = []
  const invocation = {
    executionCwd,
    invocationCwd,
    yarn: {
      execute: async (args: Array<string>) => {
        commands.push(args)

        return exitCodes[commands.length - 1] ?? 0
      },
    },
  } as unknown as WorkspaceInvocation
  const command = Object.assign(Object.create(CheckCommand.prototype), {
    targets,
    context: { invocation },
  }) as CheckCommand

  const exitCode = await command.execute()

  return { exitCode, commands }
}

test('should default targetless checks to the invocation cwd', async () => {
  const { exitCode, commands } = await runCheckCommand([])

  assert.equal(exitCode, 0)
  assert.deepEqual(commands, [
    ['format', '.'],
    ['typecheck', '.'],
    ['lint', '.'],
  ])
})

test('should run nested targetless checks from the invoking workspace', async () => {
  const { commands } = await runCheckCommand([], undefined, '/repo/packages/app')

  assert.deepEqual(commands, [
    ['format', '.'],
    ['typecheck', '.'],
    ['lint', '.'],
  ])
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

test('should serialize nested workspace targets from the workspace execution cwd', async () => {
  const { commands } = await runCheckCommand(['src/index.ts'], undefined, '/repo/packages/app')

  assert.deepEqual(commands, [
    ['format', 'src/index.ts'],
    ['typecheck', 'src/index.ts'],
    ['lint', 'src/index.ts'],
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
