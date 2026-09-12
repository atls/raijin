import type { LintOutcome }        from '@commitlint/types'

import type { CommitMessageInput } from './input.js'

import { composeCommitMessage }    from './compose.js'

interface CommitMessageValidationPolicy {
  lint: (message: string) => Promise<LintOutcome>
  format: (results: Array<LintOutcome>) => string
}

interface PrepareCommitMessageOptions {
  policy: CommitMessageValidationPolicy
  prompt: (initialValue?: CommitMessageInput) => Promise<CommitMessageInput | undefined>
  writeDiagnostics: (output: string) => void
}

export const prepareCommitMessage = async ({
  policy,
  prompt,
  writeDiagnostics,
}: PrepareCommitMessageOptions): Promise<string | undefined> => {
  const requestValidMessage = async (
    previousInput?: CommitMessageInput
  ): Promise<string | undefined> => {
    const input = await prompt(previousInput)

    if (!input) {
      return undefined
    }

    const message = composeCommitMessage(input)
    const result = await policy.lint(message)

    if (result.valid) {
      return message
    }

    const output = policy.format([result])

    if (output !== '') {
      writeDiagnostics(output)
    }

    return requestValidMessage(input)
  }

  return requestValidMessage()
}
