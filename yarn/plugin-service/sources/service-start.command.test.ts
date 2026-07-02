import assert                  from 'node:assert/strict'
import { test }                from 'node:test'

import { Filename }            from '@yarnpkg/fslib'

import { ServiceStartCommand } from './service-start.command.js'

class TestServiceStartCommand extends ServiceStartCommand {
  calls: Array<string> = []

  override async executeProxy(): Promise<number> {
    this.calls.push('proxy')

    return 0
  }

  override async executeRegular(): Promise<number> {
    this.calls.push('regular')

    return 0
  }
}

const withServiceStartEnv = async (
  env: {
    commandProxyExecution?: string
    nodeOptions?: string
  },
  callback: () => Promise<void>
): Promise<void> => {
  const previousCommandProxyExecution = process.env.COMMAND_PROXY_EXECUTION
  const previousNodeOptions = process.env.NODE_OPTIONS

  try {
    if (env.commandProxyExecution === undefined) {
      delete process.env.COMMAND_PROXY_EXECUTION
    } else {
      process.env.COMMAND_PROXY_EXECUTION = env.commandProxyExecution
    }

    if (env.nodeOptions === undefined) {
      delete process.env.NODE_OPTIONS
    } else {
      process.env.NODE_OPTIONS = env.nodeOptions
    }

    await callback()
  } finally {
    if (previousCommandProxyExecution === undefined) {
      delete process.env.COMMAND_PROXY_EXECUTION
    } else {
      process.env.COMMAND_PROXY_EXECUTION = previousCommandProxyExecution
    }

    if (previousNodeOptions === undefined) {
      delete process.env.NODE_OPTIONS
    } else {
      process.env.NODE_OPTIONS = previousNodeOptions
    }
  }
}

test('should proxy start command before managed pnp execution is active', async () => {
  await withServiceStartEnv(
    {
      commandProxyExecution: undefined,
      nodeOptions: '',
    },
    async () => {
      const command = new TestServiceStartCommand()

      await command.execute()

      assert.deepEqual(command.calls, ['proxy'])
    }
  )
})

test('should execute start command regularly after proxy re-entry', async () => {
  await withServiceStartEnv(
    {
      commandProxyExecution: 'true',
      nodeOptions: '',
    },
    async () => {
      const command = new TestServiceStartCommand()

      await command.execute()

      assert.deepEqual(command.calls, ['regular'])
    }
  )
})

test('should execute start command regularly when pnp runtime is already active', async () => {
  await withServiceStartEnv(
    {
      commandProxyExecution: undefined,
      nodeOptions: `${Filename.pnpCjs} ${Filename.pnpEsmLoader}`,
    },
    async () => {
      const command = new TestServiceStartCommand()

      await command.execute()

      assert.deepEqual(command.calls, ['regular'])
    }
  )
})
