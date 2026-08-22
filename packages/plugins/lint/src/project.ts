import type { resolveEslintProject as ResolveEslintProject } from '@atls/raijin/config/eslint'
import type { resolveEslintProjectIgnorePatterns as ResolveEslintProjectIgnorePatterns } from '@atls/raijin/config/eslint'
import type { LintMessage }                                  from '@atls/raijin/eslint'
import type { LintResult }                                   from '@atls/raijin/eslint'
import type { ESLint as EslintRuntime }                      from '@atls/raijin/eslint'

import type { LintProjectInput }                             from './interfaces/input.js'
import type { LintCounts }                                   from './interfaces/result.js'
import type { LintDiagnostic }                               from './interfaces/result.js'
import type { LintFileResult }                               from './interfaces/result.js'
import type { LintProjectResult }                            from './interfaces/result.js'

import { join }                                              from 'node:path'
import { resolve }                                           from 'node:path'

const ESLINT_RUNTIME_SPECIFIER = '@atls/raijin/eslint'
const ESLINT_CONFIG_SPECIFIER = '@atls/raijin/config/eslint'
const BASELINE_IGNORE_PATTERNS = [
  '.pnp.cjs',
  '.pnp.loader.mjs',
  '.yarn/**',
  '**/.next/**',
  '**/build/**',
  '**/bundles/**',
  '**/coverage/**',
  '**/dist/**',
]
const EMPTY_COUNTS: LintCounts = {
  errors: 0,
  fatalErrors: 0,
  warnings: 0,
  fixableErrors: 0,
  fixableWarnings: 0,
}

const importEslintModules = async () => {
  const [runtime, config] = await Promise.all([
    import(ESLINT_RUNTIME_SPECIFIER) as Promise<{ ESLint: typeof EslintRuntime }>,
    import(ESLINT_CONFIG_SPECIFIER) as Promise<{
      resolveEslintProject: typeof ResolveEslintProject
      resolveEslintProjectIgnorePatterns: typeof ResolveEslintProjectIgnorePatterns
    }>,
  ])

  return {
    ESLint: runtime.ESLint,
    resolveEslintProject: config.resolveEslintProject,
    resolveEslintProjectIgnorePatterns: config.resolveEslintProjectIgnorePatterns,
  }
}

const toDiagnostic = ({
  ruleId,
  severity,
  message,
  line,
  column,
  endLine,
  endColumn,
  fatal,
}: LintMessage): LintDiagnostic => ({
  ruleId,
  severity,
  message,
  line,
  column,
  ...(endLine === undefined ? {} : { endLine }),
  ...(endColumn === undefined ? {} : { endColumn }),
  ...(fatal === undefined ? {} : { fatal }),
})

const toCounts = ({
  errorCount,
  fatalErrorCount,
  warningCount,
  fixableErrorCount,
  fixableWarningCount,
}: LintResult): LintCounts => ({
  errors: errorCount,
  fatalErrors: fatalErrorCount,
  warnings: warningCount,
  fixableErrors: fixableErrorCount,
  fixableWarnings: fixableWarningCount,
})

const addCounts = (left: LintCounts, right: LintCounts): LintCounts => ({
  errors: left.errors + right.errors,
  fatalErrors: left.fatalErrors + right.fatalErrors,
  warnings: left.warnings + right.warnings,
  fixableErrors: left.fixableErrors + right.fixableErrors,
  fixableWarnings: left.fixableWarnings + right.fixableWarnings,
})

const toFileResult = (result: LintResult): LintFileResult => ({
  filePath: result.filePath,
  diagnostics: result.messages.map(toDiagnostic),
  ...(result.output === undefined && result.source === undefined
    ? {}
    : { source: result.output ?? result.source }),
  ...(result.output === undefined ? {} : { fixedContent: result.output }),
  counts: toCounts(result),
})

export const lintProjectSources = async ({
  rootCwd,
  cwd,
  targets,
  fix = false,
  cache = false,
}: LintProjectInput): Promise<LintProjectResult> => {
  try {
    const { ESLint, resolveEslintProject, resolveEslintProjectIgnorePatterns } =
      await importEslintModules()
    const ignorePatterns = await resolveEslintProjectIgnorePatterns(cwd)
    const eslint = new ESLint({
      ...(await resolveEslintProject({
        rootCwd,
        cwd,
        eslint: ESLint,
        fix,
        cache,
        ...(cache ? { cacheLocation: join(rootCwd, '.config/eslint/.eslintcache') } : {}),
      })),
      globInputPaths: false,
      ignorePatterns: [...BASELINE_IGNORE_PATTERNS, ...ignorePatterns],
      warnIgnored: false,
    })
    const lintTargets =
      targets && targets.length > 0 ? targets.map((target) => resolve(cwd, target)) : []
    const lintResults = await eslint.lintFiles(lintTargets)

    if (fix) {
      await ESLint.outputFixes(lintResults)
    }

    const formatter = await eslint.loadFormatter()
    const output = await formatter.format(lintResults)
    const results = lintResults.map(toFileResult)
    const counts = results.reduce<LintCounts>(
      (current, result) => addCounts(current, result.counts),
      EMPTY_COUNTS
    )
    const hasDiagnostics = counts.errors > 0 || counts.warnings > 0

    const completed = {
      status: 'completed',
      results,
      counts,
      output,
    } as const

    return hasDiagnostics
      ? { ...completed, terminal: { exitCode: 1, reason: 'diagnostics' } }
      : { ...completed, terminal: { exitCode: 0, reason: 'clean' } }
  } catch (error) {
    return {
      status: 'provider-failed',
      failure: {
        name: error instanceof Error ? error.name : 'Error',
        message: error instanceof Error ? error.message : String(error),
      },
      terminal: { exitCode: 1, reason: 'provider-failed' },
    }
  }
}
