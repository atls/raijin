import type { LintMessage } from '@atls/raijin/eslint'
import type { LintResult }  from '@atls/raijin/eslint'

export const createLintResult = (
  filePath: string,
  source: string,
  messages: Array<LintMessage>
): LintResult => ({
  filePath,
  source,
  messages,
  fixableErrorCount: 0,
  fixableWarningCount: 0,
  usedDeprecatedRules: [],
  suppressedMessages: [],
  errorCount: messages.filter((message) => message.severity === 2).length,
  fatalErrorCount: messages.filter((message) => message.fatal).length,
  warningCount: messages.filter((message) => message.severity === 1).length,
})
