import assert                                    from 'node:assert/strict'
import { mkdir }                                 from 'node:fs/promises'
import { mkdtemp }                               from 'node:fs/promises'
import { rm }                                    from 'node:fs/promises'
import { writeFile }                             from 'node:fs/promises'
import { tmpdir }                                from 'node:os'
import { join }                                  from 'node:path'
import { test }                                  from 'node:test'

import { Filename }                              from '@yarnpkg/fslib'

import { RENDERER_STANDALONE_SERVER_ENTRYPOINT } from './renderer-build.constants.js'
import { RendererStartCommand }                  from './renderer-start.command.js'
import { resolveRuntimeExecArgvModuleUrl }       from './renderer-start.command.js'

class TestRendererStartCommand extends RendererStartCommand {
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

const withRendererStartEnv = async (
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
  await withRendererStartEnv(
    {
      commandProxyExecution: undefined,
      nodeOptions: '',
    },
    async () => {
      const command = new TestRendererStartCommand()

      await command.execute()

      assert.deepEqual(command.calls, ['proxy'])
    }
  )
})

test('should execute start command regularly after proxy re-entry', async () => {
  await withRendererStartEnv(
    {
      commandProxyExecution: 'true',
      nodeOptions: '',
    },
    async () => {
      const command = new TestRendererStartCommand()

      await command.execute()

      assert.deepEqual(command.calls, ['regular'])
    }
  )
})

test('should execute start command regularly when pnp runtime is already active', async () => {
  await withRendererStartEnv(
    {
      commandProxyExecution: undefined,
      nodeOptions: `${Filename.pnpCjs} ${Filename.pnpEsmLoader}`,
    },
    async () => {
      const command = new TestRendererStartCommand()

      await command.execute()

      assert.deepEqual(command.calls, ['regular'])
    }
  )
})

test('should preserve CommonJS extension for Next standalone server entrypoint', () => {
  assert.equal(RENDERER_STANDALONE_SERVER_ENTRYPOINT, 'index.cjs')
})

test('should resolve renderer runtime module through workspace package boundary', async () => {
  const root = await mkdtemp(join(tmpdir(), 'renderer-start-workspace-'))
  const workspace = join(root, 'client', 'next-app')
  const runtime = join(workspace, 'node_modules/@atls/raijin')

  await mkdir(runtime, { recursive: true })
  await writeFile(join(workspace, 'package.json'), '{"type":"module"}\n')
  await writeFile(
    join(runtime, 'package.json'),
    JSON.stringify({
      type: 'module',
      exports: {
        './runtime-exec-argv': './runtime-exec-argv.js',
      },
    })
  )
  await writeFile(join(runtime, 'runtime-exec-argv.js'), 'export const value = true\n')

  try {
    assert.equal(
      resolveRuntimeExecArgvModuleUrl(workspace).endsWith(
        '/node_modules/@atls/raijin/runtime-exec-argv.js'
      ),
      true
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
