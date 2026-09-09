import type { ApplicationExecutionInput }  from '@atls/raijin/commands'
import type { ApplicationExecutionResult } from '@atls/raijin/commands'
import type { ApplicationInvocation }      from '@atls/raijin/commands'

import assert                              from 'node:assert/strict'
import { access }                          from 'node:fs/promises'
import { mkdir }                           from 'node:fs/promises'
import { mkdtemp }                         from 'node:fs/promises'
import { writeFile }                       from 'node:fs/promises'
import { tmpdir }                          from 'node:os'
import { join }                            from 'node:path'
import test                                from 'node:test'

import { runDevelopmentSession }           from './session.js'

const waitFor = async (predicate: () => boolean, timeoutMs = 5000): Promise<void> => {
  const timeout = Date.now() + timeoutMs

  const wait = async (): Promise<void> => {
    if (predicate()) {
      return
    }

    if (Date.now() > timeout) {
      throw new Error('Timed out waiting for development session state')
    }

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 25)
    })
    await wait()
  }

  await wait()
}

const createProject = async (): Promise<string> => {
  const cwd = await mkdtemp(join(tmpdir(), 'service-development-'))

  await mkdir(join(cwd, 'src'))
  await writeFile(join(cwd, 'package.json'), JSON.stringify({ type: 'module' }))
  await writeFile(join(cwd, 'src/index.ts'), `export const value = 'first'\n`)

  return cwd
}

test('starts initially, restarts only after successful rebuild, and closes on cancellation', async () => {
  const cwd = await createProject()
  const inputs: Array<ApplicationExecutionInput> = []
  const stopped: Array<ApplicationExecutionInput> = []
  const diagnostics: Array<number> = []
  const application: ApplicationInvocation = {
    execute: async (input) => {
      inputs.push(input)

      return new Promise<ApplicationExecutionResult>((resolve) => {
        input.cancelSignal?.addEventListener(
          'abort',
          () => {
            stopped.push(input)
            resolve({ reason: 'cancelled', stderr: '', stdout: '' })
          },
          { once: true }
        )
      })
    },
  }
  const controller = new AbortController()
  const session = runDevelopmentSession({
    application,
    cwd,
    onDiagnostics: (records) => diagnostics.push(records.length),
    signal: controller.signal,
  })

  await waitFor(() => inputs.length === 1)

  await writeFile(join(cwd, 'src/index.ts'), `export const value = 'second'\n`)
  await waitFor(() => inputs.length === 2)

  await writeFile(join(cwd, 'src/index.ts'), 'export const value = {\n')
  await waitFor(() => diagnostics.some((count) => count > 0))
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 100)
  })

  assert.equal(inputs.length, 2)
  assert.equal(stopped.length, 1)

  controller.abort('test-complete')

  assert.deepEqual(await session, { reason: 'test-complete', status: 'cancelled' })
  assert.equal(stopped.length, 2)
  await assert.rejects(access(join(cwd, '.raijin', 'service', 'development', 'index.js')))
})

test('keeps watching after a disposable non-HTTP application completes', async () => {
  const cwd = await createProject()
  let executions = 0
  const application: ApplicationInvocation = {
    execute: async () => {
      executions += 1

      return { exitCode: 0, reason: 'completed', stderr: '', stdout: '' }
    },
  }
  const controller = new AbortController()
  const session = runDevelopmentSession({ application, cwd, signal: controller.signal })

  await waitFor(() => executions === 1)
  controller.abort('test-complete')

  assert.deepEqual(await session, { reason: 'test-complete', status: 'cancelled' })
})

test('returns a failed outcome when the application cannot launch', async () => {
  const cwd = await createProject()
  const application: ApplicationInvocation = {
    execute: async () => ({ reason: 'start-failed', stderr: '', stdout: '' }),
  }
  const result = await runDevelopmentSession({
    application,
    cwd,
    signal: new AbortController().signal,
  })

  assert.equal(result.status, 'launch-failed')
})
