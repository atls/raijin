import assert                   from 'node:assert/strict'
import test                     from 'node:test'

import { composeCommitMessage } from '../compose.js'

test('should preserve the accepted message composition', () => {
  assert.equal(
    composeCommitMessage({
      type: 'feat',
      scope: 'common',
      subject: 'canonicalize message preparation',
      body: 'Keep the existing body content.',
      breaking: 'BREAKING CHANGE: remove the duplicated policy',
      issues: 'Refs #857',
      skipci: true,
    }),
    [
      'feat(common): canonicalize message preparation [skip ci]',
      'Keep the existing body content.',
      'BREAKING CHANGE: remove the duplicated policy',
      'Refs #857',
    ].join('\n\n')
  )
})
