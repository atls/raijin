import type { LintProjectResult }    from '@atls/yarn-plugin-lint'

import assert                        from 'node:assert/strict'
import { PassThrough }               from 'node:stream'
import { test }                      from 'node:test'

import { Cli }                       from 'clipanion'

import { GenerateIconsCommand }      from '../icons.js'
import { completeGeneratedIconLint } from '../icons.js'

const capture = (stream: PassThrough): (() => string) => {
  let output = ''

  stream.setEncoding('utf8')
  stream.on('data', (chunk: string) => {
    output += chunk
  })

  return () => output
}

const createCli = (): Cli => {
  const cli = new Cli({
    binaryLabel: 'Yarn',
    binaryName: 'yarn',
    binaryVersion: '0.0.0',
  })

  cli.register(GenerateIconsCommand)

  return cli
}

test('should expose the ui icons generate route and parse the native option', () => {
  const command = createCli().process(['ui', 'icons', 'generate', '--native'])

  assert.deepEqual(GenerateIconsCommand.paths, [['ui', 'icons', 'generate']])
  assert.ok(command instanceof GenerateIconsCommand)
  assert.equal(command.native, true)
})

test('should preserve generated icon lint diagnostics and provider failures', () => {
  const diagnosticsStderr = new PassThrough()
  const diagnosticsStdout = new PassThrough()
  const readDiagnosticsStderr = capture(diagnosticsStderr)
  const readDiagnosticsStdout = capture(diagnosticsStdout)
  const diagnostics: LintProjectResult = {
    status: 'completed',
    counts: {
      errors: 1,
      fatalErrors: 0,
      warnings: 0,
      fixableErrors: 0,
      fixableWarnings: 0,
    },
    output: 'source.ts: no-console\n',
    results: [],
    terminal: { exitCode: 1, reason: 'diagnostics' },
  }

  assert.equal(
    completeGeneratedIconLint(
      { stderr: diagnosticsStderr, stdout: diagnosticsStdout },
      diagnostics
    ),
    1
  )
  assert.equal(readDiagnosticsStdout(), 'source.ts: no-console\n')
  assert.equal(readDiagnosticsStderr(), '')

  const failureStderr = new PassThrough()
  const failureStdout = new PassThrough()
  const readFailureStderr = capture(failureStderr)
  const readFailureStdout = capture(failureStdout)
  const failure: LintProjectResult = {
    status: 'provider-failed',
    failure: { name: 'ESLintError', message: 'Configuration failed' },
    terminal: { exitCode: 1, reason: 'provider-failed' },
  }

  assert.equal(
    completeGeneratedIconLint({ stderr: failureStderr, stdout: failureStdout }, failure),
    1
  )
  assert.equal(readFailureStdout(), '')
  assert.equal(readFailureStderr(), 'ESLintError: Configuration failed\n')
})
