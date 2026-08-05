import type { ProcessExecutionOptions } from '@atls/raijin/commands'
import type { ProcessInvocation }       from '@atls/raijin/commands'
import type webpack                     from 'webpack'

import assert                           from 'node:assert/strict'
import test                             from 'node:test'

import { StartServerPlugin }            from '../src/start-server.plugin.js'
import { createStartServerArguments }   from '../src/start-server.plugin.js'

test('should execute the server entry with default Node arguments', () => {
  assert.deepEqual(createStartServerArguments('/repo/dist/index.js', {}, []), [
    '/repo/dist/index.js',
  ])
})

test('should pass runtime exec argv before the server entry', () => {
  assert.deepEqual(
    createStartServerArguments(
      '/repo/dist/index.js',
      {
        execArgv: ['--loader', 'file:///repo/.pnp.loader.mjs'],
      },
      []
    ),
    ['--loader', 'file:///repo/.pnp.loader.mjs', '/repo/dist/index.js']
  )
})

test('should preserve parent node exec argv', () => {
  assert.deepEqual(
    createStartServerArguments(
      '/repo/dist/index.js',
      {
        execArgv: ['--loader', 'file:///repo/.pnp.loader.mjs'],
      },
      ['--inspect']
    ),
    ['--inspect', '--loader', 'file:///repo/.pnp.loader.mjs', '/repo/dist/index.js']
  )
})

test('should restart the server through process invocation', async () => {
  const executions: Array<{ args: Array<string>; options: ProcessExecutionOptions }> = []
  const processInvocation: ProcessInvocation = {
    execute: async (_command, args, options) => {
      assert.ok(options)
      executions.push({ args, options })

      return new Promise((resolve) => {
        options.signal?.addEventListener(
          'abort',
          () => {
            resolve({ exitCode: 1, stderr: '', stdout: '' })
          },
          { once: true }
        )
      })
    },
  }
  let afterEmit: ((compilation: webpack.Compilation, callback: () => void) => void) | undefined
  const plugin = new StartServerPlugin(processInvocation)
  const compiler = {
    hooks: {
      afterEmit: {
        tapAsync: (
          _options: { name: string },
          callback: (compilation: webpack.Compilation, done: () => void) => void
        ) => {
          afterEmit = callback
        },
      },
    },
  } as webpack.Compiler
  const compilation = {
    compiler: { options: { output: { path: '/repo/dist' } } },
  } as webpack.Compilation
  const emit = async (): Promise<void> => {
    await new Promise<void>((resolve) => {
      assert.ok(afterEmit)
      afterEmit(compilation, resolve)
    })
  }

  plugin.apply(compiler)

  await emit()
  await emit()

  assert.equal(executions.length, 1)
  const [firstExecution] = executions

  assert.equal(firstExecution.args.at(-1), '/repo/dist/index.js')
  assert.equal(firstExecution.options.output?.mode, 'handle')
  assert.ok(firstExecution.options.signal)

  await emit()

  assert.equal(firstExecution.options.signal.aborted, true)
  assert.equal(executions.length, 2)

  plugin.processController?.abort()
})
