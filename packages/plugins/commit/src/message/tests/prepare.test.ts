import type { LintOutcome }        from '@commitlint/types'

import type { CommitMessageInput } from '../input.js'

import assert                      from 'node:assert/strict'
import test                        from 'node:test'

import { CommitMessagePolicy }     from '../policy.js'
import { prepareCommitMessage }    from '../prepare.js'

test('should preserve rejected input while requesting a corrected message', async () => {
  const rejected: CommitMessageInput = {
    type: 'feat',
    scope: 'common',
    subject: 'invalid.',
    body: 'keep this description',
  }
  const corrected: CommitMessageInput = {
    ...rejected,
    subject: 'accept corrected input',
  }
  const prompts: Array<CommitMessageInput | undefined> = []
  const diagnostics: Array<string> = []
  let attempt = 0

  const message = await prepareCommitMessage({
    policy: new CommitMessagePolicy(['common']),
    prompt: async (initialValue) => {
      prompts.push(initialValue)
      attempt += 1

      return attempt === 1 ? rejected : corrected
    },
    writeDiagnostics: (output) => diagnostics.push(output),
  })

  assert.equal(message, 'feat(common): accept corrected input\n\nkeep this description')
  assert.deepEqual(prompts, [undefined, rejected])
  assert.equal(diagnostics.length, 1)
  assert.match(diagnostics[0] ?? '', /subject may not end with full stop/)
})

test('should preserve cancellation without producing a message', async () => {
  const message = await prepareCommitMessage({
    policy: new CommitMessagePolicy(['common']),
    prompt: async () => undefined,
    writeDiagnostics: () => {
      throw new Error('Diagnostics should not be written for cancellation.')
    },
  })

  assert.equal(message, undefined)
})

test('should propagate commitlint failures without presenting or returning a message', async () => {
  const failure = new Error('commitlint failed')
  const validResult: LintOutcome = {
    input: 'feat(common): valid',
    valid: true,
    errors: [],
    warnings: [],
  }

  await assert.rejects(
    prepareCommitMessage({
      policy: {
        lint: async () => {
          throw failure
        },
        format: () => validResult.input,
      },
      prompt: async () => ({ type: 'feat', scope: 'common', subject: 'valid' }),
      writeDiagnostics: () => {
        throw new Error('Diagnostics should not be written after a provider failure.')
      },
    }),
    failure
  )
})
