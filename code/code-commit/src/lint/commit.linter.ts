import commitformat    from '@commitlint/format'
import commitlint      from '@commitlint/lint'
import { LintOutcome } from '@commitlint/types'

import { rules }       from './commit.rules'

export class CommitLinter {
  async lint(message: string): Promise<LintOutcome> {
    return commitlint(message, rules)
  }

  format(
    report,
    options = {
      helpUrl: 'https://github.com/conventional-changelog/commitlint/#what-is-commitlint',
    }
  ) {
    return commitformat(report, options)
  }
}
