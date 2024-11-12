import type { LintOutcome }       from '@commitlint/types'
import type { FormattableReport } from '@commitlint/types'

import { format }                 from '@commitlint/format/lib/format.js'
import commitlint                 from '@commitlint/lint'

import { rules }                  from '@atls/config-commitlint'

const defaultParserOpts = {
  // eslint-disable-next-line security/detect-unsafe-regex
  headerPattern: /^(\w*)(?:\((.*)\))?: (.*)$/,
  headerCorrespondence: ['type', 'scope', 'subject'],
  noteKeywords: ['BREAKING CHANGE'],
  revertPattern: /^(?:Revert|revert:)\s"?([\s\S]+?)"?\s*This reverts commit (\w{7,40})\b/i,
  revertCorrespondence: ['header', 'hash'],
}

export class CommitLinter {
  async lint(message: string): Promise<LintOutcome> {
    return commitlint(message, rules, {
      parserOpts: defaultParserOpts,
    })
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
