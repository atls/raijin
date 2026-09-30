import assert                       from 'node:assert/strict'
import { PassThrough }              from 'node:stream'
import test                         from 'node:test'

import { create as createExecutor } from '../executor.js'

test('should bind terminal context and map command execution options', async () => {
  const stderr = new PassThrough()
  const stdout = new PassThrough()

  stderr.resume()
  stdout.resume()

  const executor = createExecutor({
    stderr,
    stdin: new PassThrough(),
    stdout,
  })
  const result = await executor.execute(
    process.execPath,
    ['-e', "process.stdout.write(process.env.RAIJIN_EXECUTOR_TEST ?? '')"],
    {
      cwd: process.cwd(),
      environment: { ...process.env, RAIJIN_EXECUTOR_TEST: 'bound' },
      input: 'ignore',
      output: { mode: 'capture' },
    }
  )

  assert.deepEqual(result, {
    reason: 'completed',
    exitCode: 0,
    stderr: '',
    stdout: 'bound',
  })
})

test('should preserve the command completion contract when an output handler fails', async () => {
  const executor = createExecutor({
    stderr: new PassThrough(),
    stdin: new PassThrough(),
    stdout: new PassThrough(),
  })
  const result = await executor.execute(process.execPath, ['-e', "process.stdout.write('ready')"], {
    cwd: process.cwd(),
    environment: process.env,
    input: 'ignore',
    output: {
      mode: 'handle',
      handler: () => {
        throw new Error('handler failed')
      },
    },
  })

  assert.deepEqual(result, {
    reason: 'completed',
    exitCode: 0,
    stderr: '',
    stdout: '',
  })
})
