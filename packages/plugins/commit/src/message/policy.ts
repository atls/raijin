import type { RaijinProjectModel } from '@atls/raijin/project'
import type { LintOptions }        from '@commitlint/types'
import type { LintOutcome }        from '@commitlint/types'
import type { QualifiedRules }     from '@commitlint/types'
import type { Workspace }          from '@yarnpkg/core'

import { RuleConfigSeverity }      from '@commitlint/types'
import commitlintFormat            from '@commitlint/format'
import commitlint                  from '@commitlint/lint'

import { COMMIT_TYPE_ENUM }        from './type-options.js'

const PARSER_OPTIONS: LintOptions = {
  parserOpts: {
    // eslint-disable-next-line security/detect-unsafe-regex
    headerPattern: /^(\w*)(?:\((.*)\))?(!)?: (.*)$/,
    headerCorrespondence: ['type', 'scope', 'breaking', 'subject'],
    noteKeywords: ['BREAKING CHANGE'],
    revertPattern: /^(?:Revert|revert:)\s"?([\s\S]+?)"?\s*This reverts commit (\w{7,40})\b/i,
    revertCorrespondence: ['header', 'hash'],
  },
}

const RULES: QualifiedRules = {
  'body-leading-blank': [1, 'always'],
  'body-max-line-length': [2, 'always', 180],
  'footer-leading-blank': [1, 'always'],
  'footer-max-line-length': [2, 'always', 100],
  'header-max-length': [2, 'always', 140],
  'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
  'subject-empty': [2, 'never'],
  'subject-full-stop': [2, 'never', '.'],
  'type-case': [2, 'always', 'lower-case'],
  'type-empty': [2, 'never'],
  'type-enum': [2, 'always', Object.keys(COMMIT_TYPE_ENUM)],
  'scope-case': [2, 'always', 'lower-case'],
  'scope-empty': [2, 'never'],
}

const createAllowedScopes = ({ workspaces }: RaijinProjectModel<Workspace>): Array<string> => {
  const workspaceNames = new Set(workspaces.map(({ manifest }) => manifest.name?.name ?? ''))
  const scopes = new Set(workspaces.map(({ manifest }) => manifest.name?.scope ?? ''))

  return [
    'common',
    'github',
    ...Array.from(scopes).filter((scope) => scope && scope !== 'atls'),
    ...Array.from(workspaceNames).filter((workspaceName) => workspaceName),
  ]
}

export class CommitMessagePolicy {
  readonly allowedScopes: Array<string>

  private readonly rules: QualifiedRules

  constructor(allowedScopes: Array<string>) {
    this.allowedScopes = Array.from(new Set(allowedScopes))
    this.rules = {
      ...RULES,
      'scope-enum': [RuleConfigSeverity.Error, 'always', this.allowedScopes],
    }
  }

  async lint(message: string): Promise<LintOutcome> {
    return commitlint(message, this.rules, PARSER_OPTIONS)
  }

  format(results: Array<LintOutcome>): string {
    return commitlintFormat(
      { results },
      { helpUrl: 'https://github.com/conventional-changelog/commitlint/#what-is-commitlint' }
    )
  }
}

export const createCommitMessagePolicy = (
  project: RaijinProjectModel<Workspace>
): CommitMessagePolicy => new CommitMessagePolicy(createAllowedScopes(project))
