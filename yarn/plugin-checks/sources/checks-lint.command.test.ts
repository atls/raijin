import type { LintFileResult }             from '@atls/yarn-plugin-lint'
import type { LintProjectCompletedResult } from '@atls/yarn-plugin-lint'
import type { ChangedProjectState }        from '@atls/yarn-plugin-files'
import type { StreamReport }               from '@yarnpkg/core'

import assert                              from 'node:assert/strict'
import { test }                            from 'node:test'

import { MessageName }                     from '@yarnpkg/core'

import { AnnotationLevel }                 from './github.checks.js'
import { formatLintAnnotations }           from './checks-lint.command.jsx'
import { reportLintOutput }                from './checks-lint.command.jsx'
import { selectChangedLintFiles }          from './checks-lint.command.jsx'

test('should preserve one-based ESLint coordinates in GitHub annotations', () => {
  const result: LintFileResult = {
    filePath: '/project/src/index.ts',
    diagnostics: [
      {
        ruleId: 'no-console',
        severity: 2,
        message: 'Unexpected console statement.',
        line: 2,
        column: 3,
      },
    ],
    source: 'export const value = 1\n  console.log(value)\n',
    counts: {
      errors: 1,
      fatalErrors: 0,
      warnings: 0,
      fixableErrors: 0,
      fixableWarnings: 0,
    },
  }

  assert.deepEqual(formatLintAnnotations([result], '/project'), [
    {
      path: 'src/index.ts',
      start_line: 2,
      end_line: 2,
      annotation_level: AnnotationLevel.Failure,
      raw_details: '  1 | export const value = 1\n> 2 |   console.log(value)\n    |   ^\n  3 |',
      title: '(no-console): Unexpected console statement.',
      message: 'Unexpected console statement.',
    },
  ])
})

test('should report the ESLint-produced output without rendering diagnostics', () => {
  const messages: Array<[MessageName | null, string]> = []
  const report = {
    reportInfo: (name: MessageName | null, message: string): void => {
      messages.push([name, message])
    },
  } as Pick<StreamReport, 'reportInfo'>
  const result: LintProjectCompletedResult = {
    status: 'completed',
    results: [],
    counts: {
      errors: 1,
      fatalErrors: 0,
      warnings: 0,
      fixableErrors: 0,
      fixableWarnings: 0,
    },
    output: 'ESLint formatter output\n',
    terminal: { exitCode: 1, reason: 'diagnostics' },
  }

  reportLintOutput(report, result)

  assert.deepEqual(messages, [[MessageName.UNNAMED, 'ESLint formatter output\n']])
})

test('should consume changed-state files without linting deleted paths', () => {
  const state: ChangedProjectState = {
    files: [
      { path: 'src/index.ts', status: 'modified' },
      { path: 'src/removed.ts', status: 'deleted' },
      {
        path: 'src/renamed.ts',
        previousPath: 'src/original.ts',
        status: 'renamed',
      },
      { path: 'README.md', status: 'modified' },
    ],
    workspaces: [],
  }

  assert.deepEqual(selectChangedLintFiles(state), ['src/index.ts', 'src/renamed.ts'])
})
