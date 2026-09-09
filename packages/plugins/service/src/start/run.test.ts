import type { ApplicationInvocation } from '@atls/raijin/commands'

import assert                         from 'node:assert/strict'
import { mkdtemp }                    from 'node:fs/promises'
import { writeFile }                  from 'node:fs/promises'
import { tmpdir }                     from 'node:os'
import { join }                       from 'node:path'
import test                           from 'node:test'

import { stageArtifact }              from '../build/artifact.js'
import { startProject }               from './run.js'

test('rejects a workspace without a complete build artifact', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'service-start-'))
  let executions = 0
  const application: ApplicationInvocation = {
    execute: async () => {
      executions += 1

      return { exitCode: 0, reason: 'completed', stderr: '', stdout: '' }
    },
  }

  assert.deepEqual(await startProject({ application, cwd }), { status: 'artifact-missing' })
  assert.equal(executions, 0)
})

test('launches the exact completed artifact through managed execution', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'service-start-'))
  const artifact = await stageArtifact(cwd)

  await writeFile(join(artifact.path, 'index.js'), 'export {}')
  const entry = await artifact.commit()
  let executedEntry = ''
  const application: ApplicationInvocation = {
    execute: async (input) => {
      executedEntry = input.entry

      return { exitCode: 7, reason: 'completed', stderr: '', stdout: '' }
    },
  }
  const result = await startProject({ application, cwd })

  assert.equal(result.status, 'executed')
  assert.equal(executedEntry, entry)
  assert.deepEqual(result.execution, { exitCode: 7, reason: 'completed', stderr: '', stdout: '' })
})
