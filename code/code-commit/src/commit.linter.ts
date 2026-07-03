/* eslint-disable @typescript-eslint/no-shadow */

import type { FormattableReport } from '@commitlint/types'
import type { LintOutcome }       from '@commitlint/types'
import type { QualifiedRules }    from '@commitlint/types'
import type { LintRuleOutcome }   from '@commitlint/types'

import { RuleConfigSeverity }     from '@commitlint/types'
import { format }                 from '@commitlint/format/lib/format.js'

import { rules }                  from './commitlint.rules.js'

interface ParsedCommit {
  body: Array<string>
  footer: Array<string>
  header: string
  scope: string
  subject: string
  type: string
}

type RuleCondition = 'always' | 'never'
type RuleTuple =
  | Readonly<[RuleConfigSeverity, RuleCondition, unknown?]>
  | Readonly<[RuleConfigSeverity.Disabled]>
type LintRules = Record<string, RuleTuple | undefined>

// eslint-disable-next-line security/detect-unsafe-regex
const headerPattern = /^(\w*)(?:\((.*)\))?: (.*)$/
const footerPattern = /^(?:[A-Za-z0-9-]+|BREAKING CHANGE)(?:: | #).+/
const ignoredCommitPatterns = [
  /^Merge (?:branch|pull request|remote-tracking branch)\b/,
  /^Revert\s"?[\s\S]+?"?\s*This reverts commit \w{7,40}\b/i,
  /^revert:/i,
]
const scopeSeparatorPattern = /[,/\\]/

const isLowerCase = (value: string): boolean => value === value.toLowerCase()

const isSubjectCaseDenied = (value: string): boolean => {
  if (!value) {
    return false
  }

  const words = value.split(/\s+/)

  return (
    value === value.toUpperCase() ||
    /^[A-Z][a-z]/.test(value) ||
    words.every((word) => /^[A-Z][a-z]/.test(word)) ||
    /^[A-Z][a-zA-Z0-9]*$/.test(value.replace(/\s+/g, ''))
  )
}

const isBlankLine = (line: string): boolean => line.trim().length === 0

const isFooterLine = (line: string): boolean => footerPattern.test(line)

const isIgnoredCommit = (message: string): boolean =>
  ignoredCommitPatterns.some((pattern) => pattern.test(message.trim()))

const parseCommitBodyAndFooter = (lines: Array<string>): Pick<ParsedCommit, 'body' | 'footer'> => {
  const bodyStartIndex = lines.findIndex((line) => !isBlankLine(line))

  if (bodyStartIndex === -1) {
    return {
      body: [],
      footer: [],
    }
  }

  let footerStartIndex = lines.length

  while (footerStartIndex > bodyStartIndex && !isBlankLine(lines[footerStartIndex - 1])) {
    footerStartIndex -= 1
  }

  const footer = lines.slice(footerStartIndex)

  if (footer.length === 0 || !isFooterLine(footer[0])) {
    return {
      body: lines.slice(bodyStartIndex),
      footer: [],
    }
  }

  return {
    body: lines.slice(bodyStartIndex, footerStartIndex).filter((line) => !isBlankLine(line)),
    footer,
  }
}

const getScopes = (scope: string): Array<string> =>
  scope
    .split(scopeSeparatorPattern)
    .map((value) => value.trim())
    .filter(Boolean)

const parseCommit = (message: string): ParsedCommit => {
  const input = message.trim()
  const [header = '', ...lines] = input.split(/\r?\n/)
  const headerMatch = header.match(headerPattern)
  const { body, footer } = parseCommitBodyAndFooter(lines)

  return {
    body,
    footer,
    header,
    scope: headerMatch?.[2] ?? '',
    subject: headerMatch?.[3] ?? '',
    type: headerMatch?.[1] ?? '',
  }
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
    if (isIgnoredCommit(message)) {
      return {
        errors: [],
        input: message,
        valid: true,
        warnings: [],
      }
    }

    const lintRules = this.prepareConfig(rules)
    const parsed = parseCommit(message)
    const problems = this.lintParsedCommit(parsed, lintRules)
    const errors = problems.filter((problem) => problem.level === RuleConfigSeverity.Error)
    const warnings = problems.filter((problem) => problem.level === RuleConfigSeverity.Warning)

    return {
      errors,
      input: message,
      valid: errors.length === 0,
      warnings,
    }
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
  private prepareConfig(rules: QualifiedRules): LintRules {
    const allowedScopes = []

    if (this.scopes) {
      allowedScopes.push(...this.scopes.filter((scope) => scope && scope !== 'atls'))
    }

    if (this.workspaceNames) {
      allowedScopes.push(...this.workspaceNames.filter((workspaceName) => workspaceName))
    }

    const possibleScopeValuesArray = ['common', 'github', ...allowedScopes]

    return {
      ...rules,
      'scope-enum': [RuleConfigSeverity.Error, 'always', possibleScopeValuesArray],
    } as LintRules
  }

  private lintParsedCommit(parsed: ParsedCommit, lintRules: LintRules): Array<LintRuleOutcome> {
    const problems: Array<LintRuleOutcome> = []

    const pushProblem = (level: RuleConfigSeverity, name: string, message: string): void => {
      problems.push({
        level,
        message,
        name,
        valid: false,
      })
    }

    const lintEmpty = (name: string, value: string, rule: RuleTuple | undefined): void => {
      if (!rule) {
        return
      }

      const [level, condition] = rule

      if (level === RuleConfigSeverity.Disabled) {
        return
      }

      const valid = condition === 'never' ? value.length > 0 : value.length === 0

      if (!valid) {
        pushProblem(level, name, `${name} failed`)
      }
    }

    lintEmpty('subject-empty', parsed.subject, lintRules['subject-empty'])
    lintEmpty('type-empty', parsed.type, lintRules['type-empty'])

    if (parsed.type && lintRules['type-case']) {
      const [level] = lintRules['type-case']

      if (level !== RuleConfigSeverity.Disabled && !isLowerCase(parsed.type)) {
        pushProblem(level, 'type-case', 'type must be lower-case')
      }
    }

    if (parsed.type && lintRules['type-enum']) {
      const [level, , values] = lintRules['type-enum']

      if (
        level !== RuleConfigSeverity.Disabled &&
        Array.isArray(values) &&
        !values.includes(parsed.type)
      ) {
        pushProblem(level, 'type-enum', `type must be one of [${values.join(', ')}]`)
      }
    }

    const scopes = getScopes(parsed.scope)

    if (parsed.scope && lintRules['scope-case']) {
      const [level] = lintRules['scope-case']

      if (level !== RuleConfigSeverity.Disabled && scopes.some((scope) => !isLowerCase(scope))) {
        pushProblem(level, 'scope-case', 'scope must be lower-case')
      }
    }

    if (parsed.scope && lintRules['scope-enum']) {
      const [level, , values] = lintRules['scope-enum']

      if (
        level !== RuleConfigSeverity.Disabled &&
        Array.isArray(values) &&
        scopes.some((scope) => !values.includes(scope))
      ) {
        pushProblem(level, 'scope-enum', `scope must be one of [${values.join(', ')}]`)
      }
    }

    lintEmpty('scope-empty', parsed.scope, lintRules['scope-empty'])

    if (parsed.subject && lintRules['subject-case']) {
      const [level] = lintRules['subject-case']

      if (level !== RuleConfigSeverity.Disabled && isSubjectCaseDenied(parsed.subject)) {
        pushProblem(level, 'subject-case', 'subject must not use denied case')
      }
    }

    if (parsed.subject && lintRules['subject-full-stop']) {
      const [level, condition, value] = lintRules['subject-full-stop']
      const suffix = typeof value === 'string' ? value : ''
      const valid =
        condition === 'never' ? !parsed.subject.endsWith(suffix) : parsed.subject.endsWith(suffix)

      if (level !== RuleConfigSeverity.Disabled && !valid) {
        pushProblem(level, 'subject-full-stop', `subject must not end with ${suffix}`)
      }
    }

    if (lintRules['header-max-length']) {
      const [level, , value] = lintRules['header-max-length']

      if (
        level !== RuleConfigSeverity.Disabled &&
        typeof value === 'number' &&
        parsed.header.length > value
      ) {
        pushProblem(
          level,
          'header-max-length',
          `header must not be longer than ${value} characters`
        )
      }
    }

    this.lintLines('body-max-line-length', parsed.body, lintRules, problems)
    this.lintLines('footer-max-line-length', parsed.footer, lintRules, problems)

    return problems
  }

  private lintLines(
    name: 'body-max-line-length' | 'footer-max-line-length',
    lines: Array<string>,
    lintRules: LintRules,
    problems: Array<LintRuleOutcome>
  ): void {
    const rule = lintRules[name]

    if (!rule) {
      return
    }

    const [level, , value] = rule

    if (level === RuleConfigSeverity.Disabled) {
      return
    }

    if (typeof value !== 'number') {
      return
    }

    for (const line of lines) {
      if (line.length > value) {
        problems.push({
          level,
          message: `${name} failed`,
          name,
          valid: false,
        })
      }
    }
  }
}
