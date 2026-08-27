import type { ProjectInvocation }             from '@atls/raijin/commands'
import type { PortablePath }                  from '@yarnpkg/fslib'

import type { ProjectTestExecutionProviders } from '../execute.js'

import assert                                 from 'node:assert/strict'
import { test }                               from 'node:test'

import { createCommandInput }                 from '@atls/raijin/commands'

import { TEST_PRODUCER_PATH }                 from '../producer.js'
import { executeProjectTestsWithProviders }   from '../execute.js'

type NodeExecute = ProjectInvocation['node']['execute']

const createInput = (execute: NodeExecute) => ({
  input: createCommandInput({ cwd: '/repo' as PortablePath, source: 'generated', targets: [] }),
  invocation: {
    executionCwd: '/repo',
    node: { execute },
    project: { cwd: '/repo' },
  } as unknown as ProjectInvocation,
  reporter: 'silent' as const,
  scenario: 'unit' as const,
})

test('returns a typed discovery failure without starting managed execution', async () => {
  let runtimeResolutions = 0
  let managedExecutions = 0
  const providers: ProjectTestExecutionProviders = {
    discover: async () => {
      throw new Error('Test target does not exist: missing.test.ts')
    },
    resolveRuntimeExecArgv: async () => {
      runtimeResolutions += 1

      return []
    },
  }

  const result = await executeProjectTestsWithProviders(
    createInput(async () => {
      managedExecutions += 1

      return { exitCode: 0, reason: 'completed', stderr: '', stdout: '' }
    }),
    providers
  )

  assert.equal(result.reason, 'provider-failed')
  assert.deepEqual(result.detail, {
    message: 'Test target does not exist: missing.test.ts',
    stage: 'discovery',
  })
  assert.equal(runtimeResolutions, 0)
  assert.equal(managedExecutions, 0)
})

test('returns a typed runtime argv failure without starting managed execution', async () => {
  let managedExecutions = 0
  const providers: ProjectTestExecutionProviders = {
    discover: async () => ['/repo/unit.test.ts'],
    resolveRuntimeExecArgv: async () => {
      throw new Error('Raijin runtime argv provider is unavailable')
    },
  }

  const result = await executeProjectTestsWithProviders(
    createInput(async () => {
      managedExecutions += 1

      return { exitCode: 0, reason: 'completed', stderr: '', stdout: '' }
    }),
    providers
  )

  assert.equal(result.reason, 'provider-failed')
  assert.deepEqual(result.detail, {
    message: 'Raijin runtime argv provider is unavailable',
    stage: 'runtime-argv',
  })
  assert.equal(managedExecutions, 0)
})

test('returns a typed managed execution provider rejection', async () => {
  let managedExecutions = 0
  const providers: ProjectTestExecutionProviders = {
    discover: async () => ['/repo/unit.test.ts'],
    resolveRuntimeExecArgv: async () => [],
  }

  const result = await executeProjectTestsWithProviders(
    createInput(async () => {
      managedExecutions += 1

      throw new Error('Managed Node provider rejected the start request')
    }),
    providers
  )

  assert.equal(result.reason, 'provider-failed')
  assert.deepEqual(result.detail, {
    message: 'Managed Node provider rejected the start request',
    stage: 'managed-execution',
  })
  assert.equal(managedExecutions, 1)
})

test('starts the managed producer through its private Clipanion path', async () => {
  let managedInput: Parameters<NodeExecute>[0] | undefined
  const providers: ProjectTestExecutionProviders = {
    discover: async () => ['/repo/unit.test.ts'],
    resolveRuntimeExecArgv: async () => [],
  }

  const result = await executeProjectTestsWithProviders(
    createInput(async (input) => {
      managedInput = input

      return { messages: [], reason: 'cancelled', stderr: '', stdout: '' }
    }),
    providers
  )

  assert.equal(result.reason, 'cancelled')
  assert.ok(managedInput)
  assert.deepEqual(managedInput.arguments, [...TEST_PRODUCER_PATH])

  const { channel } = managedInput

  assert.ok(channel)

  const { input: channelInput } = channel

  assert.ok(typeof channelInput === 'object' && channelInput !== null && 'type' in channelInput)
  assert.equal(channelInput.type, 'execute')
})
