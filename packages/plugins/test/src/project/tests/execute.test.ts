import type { ProjectInvocation }       from '@atls/raijin/commands'
import type { PortablePath }            from '@yarnpkg/fslib'

import type { ProjectTestPorts }        from '../ports/execution.js'

import assert                           from 'node:assert/strict'
import { test }                         from 'node:test'

import { createCommandInput }           from '@atls/raijin/commands'

import { executeProjectTestsWithPorts } from '../execute.js'

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
  const ports: ProjectTestPorts = {
    discover: async () => {
      throw new Error('Test target does not exist: missing.test.ts')
    },
    invokeChild: async () => {
      managedExecutions += 1

      throw new Error('Managed execution should not start')
    },
    resolveRuntimeArgv: async () => {
      runtimeResolutions += 1

      return []
    },
  }

  const result = await executeProjectTestsWithPorts(
    createInput(async () => ({
      exitCode: 0,
      reason: 'completed',
      stderr: '',
      stdout: '',
    })),
    ports
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
  const ports: ProjectTestPorts = {
    discover: async () => ['/repo/unit.test.ts'],
    invokeChild: async () => {
      managedExecutions += 1

      throw new Error('Managed execution should not start')
    },
    resolveRuntimeArgv: async () => {
      throw new Error('Raijin runtime argv provider is unavailable')
    },
  }

  const result = await executeProjectTestsWithPorts(
    createInput(async () => ({
      exitCode: 0,
      reason: 'completed',
      stderr: '',
      stdout: '',
    })),
    ports
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
  const ports: ProjectTestPorts = {
    discover: async () => ['/repo/unit.test.ts'],
    invokeChild: async () => {
      managedExecutions += 1

      throw new Error('Managed Node provider rejected the start request')
    },
    resolveRuntimeArgv: async () => [],
  }

  const result = await executeProjectTestsWithPorts(
    createInput(async () => ({
      exitCode: 0,
      reason: 'completed',
      stderr: '',
      stdout: '',
    })),
    ports
  )

  assert.equal(result.reason, 'provider-failed')
  assert.deepEqual(result.detail, {
    message: 'Managed Node provider rejected the start request',
    stage: 'managed-execution',
  })
  assert.equal(managedExecutions, 1)
})
