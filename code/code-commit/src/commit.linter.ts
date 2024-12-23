import type { FormattableReport } from '@commitlint/types'
import type { LintOptions }       from '@commitlint/types'

import { RuleConfigSeverity }     from '@commitlint/types'
import { LintOutcome }            from '@commitlint/types'
import { QualifiedRules }         from '@commitlint/types'
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

const options: LintOptions = {
  parserOpts: defaultParserOpts,
}

interface CommitLinterOptions {
  scopes?: Array<string>
  workspaceNames?: Array<string>
}

export class CommitLinter {
  readonly scopes?: Array<string>

  readonly workspaceNames?: Array<string>

  constructor({ scopes, workspaceNames }: CommitLinterOptions) {
    this.scopes = scopes
    this.workspaceNames = workspaceNames
  }

  async lint(message: string): Promise<LintOutcome> {
    const lintRules = this.prepareConfig(rules)

    return commitlint(message, lintRules, options)
  }

  format(
    report: FormattableReport,
    options = {
      helpUrl: 'https://github.com/conventional-changelog/commitlint/#what-is-commitlint',
    }
  ): string {
    return format(report, options)
  }

  /**
   * Prepares config, including scopes
   */
  private prepareConfig(rules: QualifiedRules) {
    const allowedScopes = []

    if (this.scopes) {
      allowedScopes.push(...this.scopes.filter((scope) => scope && scope !== 'atls'))
    }

    if (this.workspaceNames) {
      allowedScopes.push(...this.workspaceNames.filter((workspaceName) => workspaceName))
    }

    const possibleScopeValuesArray = ['common', 'github', ...allowedScopes]
    rules['scope-enum'] = [RuleConfigSeverity.Error, 'always', possibleScopeValuesArray]

    return rules
  }
}
