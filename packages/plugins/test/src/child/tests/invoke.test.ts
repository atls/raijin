import type { ProjectInvocation } from '@atls/raijin/commands'

import assert                     from 'node:assert/strict'
import { test }                   from 'node:test'

import { TEST_PRODUCER_PATH }     from '../protocol.js'
import { invokeTestChild }        from '../invoke.js'

type NodeExecute = ProjectInvocation['node']['execute']

test('starts the managed producer through its private Clipanion path', async () => {
  let managedInput: Parameters<NodeExecute>[0] | undefined
  const execute: NodeExecute = async (input) => {
    managedInput = input

    return { messages: [], reason: 'cancelled', stderr: '', stdout: '' }
  }
  const result = await invokeTestChild({
    executionCwd: '/repo',
    node: { execute },
    run: {
      concurrency: true,
      execArgv: [],
      files: ['/repo/unit.test.ts'],
      projectCwd: '/repo',
      reporter: 'silent',
      testTimeoutMs: 240_000,
      watch: false,
    },
  })

  assert.equal(result.reason, 'cancelled')
  assert.ok(managedInput)
  assert.deepEqual(managedInput.arguments, [...TEST_PRODUCER_PATH])

  const { channel } = managedInput

  assert.ok(channel)

  const { input: channelInput } = channel

  assert.ok(typeof channelInput === 'object' && channelInput !== null && 'type' in channelInput)
  assert.equal(channelInput.type, 'execute')
})
