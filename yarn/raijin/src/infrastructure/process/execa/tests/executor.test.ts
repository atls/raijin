import assert                         from 'node:assert/strict'
import { PassThrough }                from 'node:stream'
import test                           from 'node:test'

import { createExecaProcessExecutor } from '../executor.js'

test('should bind terminal context and map command execution options', async () => {
  const stderr = new PassThrough()
  const stdout = new PassThrough()

  stderr.resume()
  stdout.resume()

  const executor = createExecaProcessExecutor({
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
