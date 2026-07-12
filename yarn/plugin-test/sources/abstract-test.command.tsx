/* eslint-disable n/no-sync */

import type { EventData }             from 'node:test'

import { readFileSync }               from 'node:fs'
import { relative }                   from 'node:path'

import { BaseCommand }                from '@yarnpkg/cli'
import { Option }                     from 'clipanion'
import { Command }                    from 'clipanion'
import { render }                     from 'ink'
import { isEnum }                     from 'typanion'
import React                          from 'react'

import { ErrorInfo }                  from '@atls/cli-ui-error-info-component'
import { LogRecord }                  from '@atls/cli-ui-log-record-component'
import { RawOutput }                  from '@atls/cli-ui-raw-output-component'
import { TestFailure }                from '@atls/cli-ui-test-failure-component'
import { TestProgress }               from '@atls/cli-ui-test-progress-component'
import { Tester }                     from '@atls/code-test'
import { renderStatic }               from '@atls/cli-ui-renderer-static-component'
import { proxyWorkspaceCommand }      from '@atls/raijin/commands'
import { resolveProjectInvocation }   from '@atls/raijin/commands'
import { resolveWorkspaceInvocation } from '@atls/raijin/commands'
import { toNativeCwd }                from '@atls/raijin/commands'

type TestFail = EventData.TestFail
type TestStderr = EventData.TestStderr
type TestStdout = EventData.TestStdout

interface ProxyTestArgsOptions {
  files: Array<string>
  target?: string
  testReporter?: string
  watch: boolean
}

export const createProxyTestArgs = ({
  files,
  target,
  testReporter,
  watch,
}: ProxyTestArgsOptions): Array<string> => {
  const args: Array<string> = []

  if (files.length) {
    args.push(...files)
  }

  if (watch) {
    args.push('-w')
  }

  if (target) {
    args.push('-t')
    args.push(target)
  }

  if (testReporter) {
    args.push(`--test-reporter=${testReporter}`)
  }

  return args
}

export abstract class AbstractTestCommand extends BaseCommand {
  static override usage = Command.Usage({
    description: 'Run tests',
    details: `
    Run either integration or unit tests with Node.js built-in test runner.
    
    Integration tests are defined by placing *.test.[j|t]sx? in 'integration' folder anywhere.
    
    Unit tests are all *.test.[j|t]sx? except in 'integration' folder.
    `,
    examples: [
      ['Run all unit tests', 'yarn test unit'],
      ['Run all integration tests', 'yarn test integration'],
      [`Run all integration tests which file names include 'menu'`, 'yarn test integration menu'],
      [
        `Run all unit tests in watch mode - reloading after any change in file`,
        'yarn test unit -w',
      ],
    ],
  })

  target = Option.String('-t,--target')

  watch: boolean = Option.Boolean('-w,--watch', false)

  files: Array<string> = Option.Rest({ required: 0 })

  testReporter = Option.String('--test-reporter', {
    validator: isEnum(['tap']),
  })

  private std = new Map<string | undefined, Array<string>>()

  private bufferedStdTimeout: NodeJS.Timeout | undefined

  async executeProxy(type?: 'integration' | 'unit'): Promise<number> {
    const { invocationCwd } = await resolveProjectInvocation(this.context.cwd, this.context.plugins)
    const args = createProxyTestArgs({
      files: this.files,
      watch: this.watch,
      target: toNativeCwd(invocationCwd),
      testReporter: this.testReporter,
    })

    const nodeOptions = process.env.NODE_OPTIONS?.includes('--no-warnings')
      ? process.env.NODE_OPTIONS
      : `${process.env.NODE_OPTIONS ?? ''} --no-warnings=DeprecationWarning`

    return proxyWorkspaceCommand({
      args: ['test', type ?? '', ...args],
      cwd: this.context.cwd,
      plugins: this.context.plugins,
      env: { NODE_OPTIONS: nodeOptions },
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
    })
  }

  async executeRegular(type: 'integration' | 'unit'): Promise<number> {
    const { executionCwd, invocationCwd, project } = await resolveWorkspaceInvocation(
      this.context.cwd,
      this.context.plugins
    )
    const projectCwd = toNativeCwd(project.cwd)

    const onStdout = (data: TestStdout): void => {
      this.bufferedStd(data, (stdBuffer) => {
        this.renderStdBuffer(stdBuffer)
      })
    }

    const onStderr = (data: TestStderr): void => {
      this.bufferedStd(data, (stdBuffer) => {
        this.renderStdBuffer(stdBuffer)
      })
    }

    const onFail = (data: TestFail): void => {
      const source = data.file ? readFileSync(data.file, 'utf8') : undefined

      renderStatic(
        <TestFailure
          details={data.details}
          source={source}
          file={data.file ? relative(projectCwd, data.file) : undefined}
          column={data.column}
          line={data.line}
        />
      )
        .split('\n')
        .forEach((line) => {
          console.error(line) // eslint-disable-line no-console
        })
    }

    const tester = await Tester.initialize(toNativeCwd(executionCwd), {
      projectCwd,
    })
    const target = this.target ?? toNativeCwd(this.files.length > 0 ? invocationCwd : project.cwd)

    if (this.testReporter === 'tap') {
      const results =
        type === 'integration'
          ? await tester.integration(target, {
              files: this.files,
              watch: this.watch,
              testReporter: this.testReporter,
            })
          : await tester.unit(target, {
              files: this.files,
              watch: this.watch,
              testReporter: this.testReporter,
            })

      return results.find((result) => result.type === 'test:fail') ? 1 : 0
    }

    tester.on('test:stdout', onStdout)
    tester.on('test:stderr', onStderr)
    tester.on('test:fail', onFail)

    const { clear, unmount } = render(<TestProgress cwd={projectCwd} tester={tester} />)

    try {
      const results =
        type === 'integration'
          ? await tester.integration(target, {
              files: this.files,
              watch: this.watch,
              testReporter: this.testReporter,
            })
          : await tester.unit(target, {
              files: this.files,
              watch: this.watch,
              testReporter: this.testReporter,
            })

      return results.find((result) => result.type === 'test:fail') ? 1 : 0
    } catch (error) {
      if (error instanceof Error) {
        renderStatic(<ErrorInfo error={error} />)
          .split('\n')
          .forEach((line) => {
            console.error(line) // eslint-disable-line no-console
          })
      } else {
        console.error(error) // eslint-disable-line no-console
      }

      return 1
    } finally {
      this.flushBufferedStd()

      tester.off('test:stdout', onStdout)
      tester.off('test:stderr', onStderr)
      tester.off('test:fail', onFail)

      unmount()
      clear()
    }
  }

  private bufferedStd(
    data: TestStderr | TestStdout,
    callback: (params: { file?: string; messages: Array<string> }) => void
  ): void {
    if (this.std.keys().next().value) {
      if (this.std.has(data.file)) {
        this.std.get(data.file)?.push(data.message)

        if (this.bufferedStdTimeout) {
          clearTimeout(this.bufferedStdTimeout)
        }

        this.bufferedStdTimeout = setTimeout(() => {
          const key: string | undefined = this.std.keys().next().value

          callback({ file: key, messages: this.std.get(key) ?? [] })

          this.std.delete(key)
        }, 100)
      } else {
        const key: string | undefined = this.std.keys().next().value

        callback({ file: key, messages: this.std.get(key) ?? [] })

        this.std.delete(key)

        this.std.set(data.file, [data.message])
      }
    } else {
      this.std.set(data.file, [data.message])
    }
  }

  private renderStdBuffer({ file, messages }: { file?: string; messages: Array<string> }): void {
    const items = messages.map((message) => message.split('\n').filter(Boolean)).flat()

    const { logRecords, raw } = items.reduce(
      (result: { logRecords: Array<unknown>; raw: Array<string> }, item: string) => {
        try {
          const logRecord = JSON.parse(item)

          return {
            ...result,
            logRecords: [...result.logRecords, logRecord],
          }
        } catch {
          return {
            ...result,
            raw: [...result.raw, item],
          }
        }
      },
      { logRecords: [], raw: [] }
    )

    logRecords.forEach((logRecord) => {
      // eslint-disable-next-line no-console
      console.log(renderStatic(<LogRecord {...logRecord} />))
    })

    if (raw.length > 0) {
      // eslint-disable-next-line no-console
      console.log(
        renderStatic(
          <RawOutput file={file ? relative(process.cwd(), file) : undefined} messages={raw} />
        )
      )
    }
  }

  private flushBufferedStd(): void {
    if (this.bufferedStdTimeout) {
      clearTimeout(this.bufferedStdTimeout)
      this.bufferedStdTimeout = undefined
    }

    this.std.forEach((messages, file) => {
      this.renderStdBuffer({ file, messages })
    })

    this.std.clear()
  }
}
