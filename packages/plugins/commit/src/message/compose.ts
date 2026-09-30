import type { CommitMessageInput } from './input.js'

import wrap                        from 'word-wrap'

const WRAP_OPTIONS = {
  trim: true,
  cut: false,
  newline: '\n',
  indent: '',
  width: 100,
}

export const composeCommitMessage = (input: CommitMessageInput): string => {
  let head = `${input.type}${input.scope ? `(${input.scope})` : ''}: ${input.subject}`

  if (input.skipci) {
    head += ' [skip ci]'
  }

  const body = input.body ? wrap(input.body, WRAP_OPTIONS) : false
  const breaking = input.breaking
    ? wrap(
        `BREAKING CHANGE: ${input.breaking.trim().replace(/^BREAKING CHANGE: /, '')}`,
        WRAP_OPTIONS
      )
    : false
  const issues = input.issues ? wrap(input.issues, WRAP_OPTIONS) : false

  return [head, body, breaking, issues].filter(Boolean).join('\n\n')
}
