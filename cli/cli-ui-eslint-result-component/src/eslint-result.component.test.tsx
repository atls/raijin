import { describe }     from '@jest/globals'
import { expect }       from '@jest/globals'
import { it }           from '@jest/globals'

import React            from 'react'
import stripAnsi        from 'strip-ansi'

import { renderStatic } from '@atls/cli-ui-renderer'

import { ESLintResult } from './eslint-result.component.jsx'

describe('eslint result component', () => {
  it('render', () => {
    const value = {
      filePath: `${process.cwd()}/yarn/cli/src/tools/getPluginConfiguration.ts`,
      messages: [
        {
          ruleId: '@typescript-eslint/quotes',
          severity: 2,
          message: 'Strings must use singlequote.',
          line: 12,
          column: 44,
          nodeType: 'TemplateLiteral',
          messageId: 'wrongQuotes',
          endLine: 12,
          endColumn: 62,
          fix: { range: [447, 465], text: "'@yarnpkg/builder'" },
        },
      ],
      errorCount: 1,
      fatalErrorCount: 0,
      warningCount: 0,
      fixableErrorCount: 1,
      fixableWarningCount: 0,
      source:
        "/* eslint-disable import/no-dynamic-require */\n/* eslint-disable no-restricted-syntax */\n/* eslint-disable global-require */\n\nimport packageJson             from '@atls/yarn-cli/package.json'\nimport { PluginConfiguration } from '@yarnpkg/core'\n\nimport { getDynamicLibs }      from './getDynamicLibs'\n\nexport function getPluginConfiguration(): PluginConfiguration {\n  const plugins = new Set<string>()\n  for (const dependencyName of packageJson[`@yarnpkg/builder`].bundles.standard)\n    plugins.add(dependencyName)\n\n  const modules = getDynamicLibs()\n  for (const plugin of plugins) modules.set(plugin, require(plugin).default)\n\n  return { plugins, modules }\n}\n",
      usedDeprecatedRules: [
        {
          ruleId: 'lines-around-directive',
          replacedBy: ['padding-line-between-statements'],
        },
        { ruleId: 'global-require', replacedBy: [] },
        { ruleId: 'no-buffer-constructor', replacedBy: [] },
        { ruleId: 'no-new-require', replacedBy: [] },
        { ruleId: 'no-path-concat', replacedBy: [] },
      ],
    }

    const output = renderStatic(<ESLintResult {...value} />, 160)

    expect(stripAnsi(output)).toMatchSnapshot()
  })
})
