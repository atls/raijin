import assert                   from 'node:assert/strict'
import test                     from 'node:test'

import { CommitMessageCommand } from '../command.jsx'

test('should bypass source-driven commit messages before project invocation', () => {
  const command = new CommitMessageCommand()

  command.args = ['/tmp/COMMIT_EDITMSG', 'merge']

  assert.equal(command.executeBeforeInvocation(), 0)
})

test('should continue to project invocation for an interactive message', () => {
  const command = new CommitMessageCommand()

  command.args = ['/tmp/COMMIT_EDITMSG']

  assert.equal(command.executeBeforeInvocation(), undefined)
})

test('should reject a missing commit message file before project invocation', () => {
  const command = new CommitMessageCommand()

  command.args = []

  assert.throws(() => command.executeBeforeInvocation(), /Commit edit message file required\./)
})
