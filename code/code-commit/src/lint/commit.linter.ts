import type { LintOutcome }       from '@commitlint/types'
import type { FormattableReport } from '@commitlint/types'

import { format }                 from '@commitlint/format/lib/format.js'

import { rules }                  from './commit.rules.js'
import { lint as commitlint }     from './commitlint.js'

export class CommitLinter {
  async lint(message: string): Promise<LintOutcome> {
    return commitlint(message, rules)
  }

  format(
    report: FormattableReport,
    options = {
      helpUrl: 'https://github.com/conventional-changelog/commitlint/#what-is-commitlint',
    }
  ): string {
    return format(report, options)
  }
}
