import type { CommandInput }         from '@atls/raijin/commands'
import type { CommandTarget }        from '@atls/raijin/commands'
import type { EventData }            from 'node:test'
import type { TestEvent }            from 'node:test/reporters'

import EventEmitter                  from 'node:events'
import { readFileSync }              from 'node:fs'
import { stat }                      from 'node:fs/promises'
/* eslint-disable @typescript-eslint/member-ordering */
import { relative }                  from 'node:path'
import { resolve as resolvePath }    from 'node:path'
import { join }                      from 'node:path'
import { basename }                  from 'node:path'
import { run }                       from 'node:test'
import { tap }                       from 'node:test/reporters'

import ignorer                       from 'ignore'

import { toNativeCwd }               from '@atls/raijin/commands'
import { toPortableCwd }             from '@atls/raijin/commands'
import { discoverFiles }             from '@atls/raijin/filesystem'
import { toNativePath }              from '@atls/raijin/filesystem'
import { toPortablePath }            from '@atls/raijin/filesystem'

import { Tests }                     from './tests.js'
import { parseTestExecArgv }         from './test-exec-argv.js'
import { createTestRuntimeExecArgv } from './test-exec-argv.js'

export type TestsStream = ReturnType<typeof run>

type TestFail = EventData.TestFail
type TestPass = EventData.TestPass
type TestStderr = EventData.TestStderr
type TestStdout = EventData.TestStdout
type TestSummary = EventData.TestSummary
type TargetStat = Awaited<ReturnType<typeof stat>>
type ExistingTargetPath = {
  path: string
  stat: TargetStat
}
type MissingTargetPath = {
  error: unknown
}
type TargetPathResult = ExistingTargetPath | MissingTargetPath

type TestOptions = {
  watch?: boolean
  testReporter?: string
}

type TestType = 'integration' | 'unit' | undefined
type TesterOptions = {
  projectCwd?: string
}

const TEST_STREAM_KEEP_ALIVE_INTERVAL = 1000

const createTestEvent = <T>(type: string, data: T): TestEvent => ({ type, data }) as TestEvent

const isFinalSummary = (data: TestSummary): boolean => !data.file

const hasReporterFailures = (output: string): boolean =>
  output.includes('\nnot ok ') || /# (?:fail|cancelled) [1-9]\d*/.test(output)

const isMissingPathError = (error: unknown): boolean =>
  !!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')

const isExistingTargetPath = (result: TargetPathResult): result is ExistingTargetPath =>
  'stat' in result

const toNativeFiles = (files: Awaited<ReturnType<typeof discoverFiles>>): Array<string> =>
  files.map((file) => toNativePath(file))

export class Tester extends EventEmitter {
  private ignore: ignorer.Ignore

  private readonly projectCwd: string

  constructor(
    private readonly cwd: string,
    { projectCwd = cwd }: TesterOptions = {}
  ) {
    super()

    this.projectCwd = projectCwd
    this.ignore = ignorer.default().add(this.getProjectIgnorePatterns())
  }

  protected async run(
    files: Array<string>,
    timeout: number,
    concurrency: boolean,
    watch = false,
    testReporter?: string
  ): Promise<Array<TestEvent>> {
    const explicitExecArgv = parseTestExecArgv()
    const execArgv =
      explicitExecArgv.length > 0 ? explicitExecArgv : await createTestRuntimeExecArgv(this.cwd)
    const runOptions = {
      files,
      timeout,
      concurrency,
      watch,
      ...(execArgv.length > 0 ? { execArgv } : {}),
    }

    if (testReporter === 'tap') {
      const testsStream = run(runOptions)
      const result = testsStream.compose(tap)

      result.pipe(process.stdout)

      return this.collectTestsStream(testsStream, result, watch)
    }

    const tests = await Tests.load(files)

    this.emit('start', { tests })

    const testsStream = run(runOptions)
    const drainReporter = testsStream.compose(tap)

    const onPass = (data: TestPass): void => {
      this.emit('test:pass', data)
    }

    const onFail = (data: TestFail): void => {
      this.emit('test:fail', data)
    }

    const onStdout = (data: TestStdout): void => {
      this.emit('test:stdout', data)
    }

    const onStderr = (data: TestStderr): void => {
      this.emit('test:stderr', data)
    }

    testsStream.on('test:pass', onPass)
    testsStream.on('test:fail', onFail)
    testsStream.on('test:stdout', onStdout)
    testsStream.on('test:stderr', onStderr)

    try {
      return await this.collectTestsStream(testsStream, drainReporter, watch)
    } finally {
      this.emit('end')

      testsStream.off('test:pass', onPass)
      testsStream.off('test:fail', onFail)
      testsStream.off('test:stdout', onStdout)
      testsStream.off('test:stderr', onStderr)
    }
  }

  static async initialize(cwd: string, options?: TesterOptions): Promise<Tester> {
    return new Tester(cwd, options)
  }

  private async collectTestsStream(
    testsStream: TestsStream,
    reporter?: NodeJS.ReadableStream,
    watch = false
  ): Promise<Array<TestEvent>> {
    const events: Array<TestEvent> = []
    let reporterOutput = ''
    const keepAlive = setInterval(() => undefined, TEST_STREAM_KEEP_ALIVE_INTERVAL)

    return new Promise((resolve, reject) => {
      let cleanup = (): void => undefined

      function resolveWithEvents(): void {
        cleanup()

        resolve(events)
      }

      function onPass(data: TestPass): void {
        events.push(createTestEvent('test:pass', data))
      }

      function onFail(data: TestFail): void {
        events.push(createTestEvent('test:fail', data))
      }

      function onStdout(data: TestStdout): void {
        events.push(createTestEvent('test:stdout', data))
      }

      function onStderr(data: TestStderr): void {
        events.push(createTestEvent('test:stderr', data))
      }

      function onSummary(data: TestSummary): void {
        events.push(createTestEvent('test:summary', data))

        if (!watch && isFinalSummary(data)) {
          resolveWithEvents()
        }
      }

      function onReporterData(chunk: Buffer | string): void {
        reporterOutput += chunk.toString()
      }

      function onReporterEnd(): void {
        if (hasReporterFailures(reporterOutput)) {
          events.push(createTestEvent('test:fail', {} as TestFail))
        }

        resolveWithEvents()
      }

      function onEnd(): void {
        resolveWithEvents()
      }

      function onError(error: Error): void {
        cleanup()

        reject(error)
      }

      cleanup = (): void => {
        clearInterval(keepAlive)

        testsStream.off('test:pass', onPass)
        testsStream.off('test:fail', onFail)
        testsStream.off('test:stdout', onStdout)
        testsStream.off('test:stderr', onStderr)
        testsStream.off('test:summary', onSummary)
        testsStream.off('end', onEnd)
        testsStream.off('error', onError)

        reporter?.off('data', onReporterData)
        reporter?.off('end', onReporterEnd)
        reporter?.off('error', onError)
      }

      testsStream.on('test:pass', onPass)
      testsStream.on('test:fail', onFail)
      testsStream.on('test:stdout', onStdout)
      testsStream.on('test:stderr', onStderr)
      testsStream.on('test:summary', onSummary)
      testsStream.once('end', onEnd)
      testsStream.once('error', onError)

      reporter?.on('data', onReporterData)
      reporter?.once('end', onReporterEnd)
      reporter?.once('error', onError)
    })
  }

  async unit(input: CommandInput, options?: TestOptions): Promise<Array<TestEvent>> {
    const testFiles = await this.collectTestFiles(input, 'unit')

    const finalFiles = testFiles.filter(
      (file) => this.ignore.filter([relative(this.cwd, file)]).length !== 0
    )

    return this.run(finalFiles, 240_000, true, options?.watch, options?.testReporter)
  }

  async integration(input: CommandInput, options?: TestOptions): Promise<Array<TestEvent>> {
    const testFiles = await this.collectTestFiles(input, 'integration')

    const finalFiles = testFiles.filter(
      (file) => this.ignore.filter([relative(this.cwd, file)]).length !== 0
    )

    return this.run(finalFiles, 420_000, false, options?.watch, options?.testReporter)
  }

  async general(input: CommandInput, options?: TestOptions): Promise<Array<TestEvent>> {
    const testFiles = await this.collectTestFiles(input, undefined)

    const finalFiles = testFiles.filter(
      (file) => this.ignore.filter([relative(this.cwd, file)]).length !== 0
    )

    return this.run(finalFiles, 420_000, true, options?.watch, options?.testReporter)
  }

  private async collectTestFiles(input: CommandInput, type: TestType): Promise<Array<string>> {
    const cwd = toNativeCwd(input.cwd)
    let folderPattern = '*'
    if (type !== undefined) {
      folderPattern = type === 'unit' ? '!(integration)' : 'integration'
    }

    if (input.targets.length < 1) {
      return toNativeFiles(
        await discoverFiles({
          cwd: input.cwd,
          patterns: [`**/${folderPattern}/*.test.{ts,tsx,js,jsx}`],
          ignore: ['**/node_modules/**', '**/dist/**', '**/.yarn/**'],
          dot: true,
        })
      )
    }

    const testFiles = await Promise.all(
      input.targets.map(async (target) =>
        this.collectPatternTestFiles(cwd, folderPattern, type, target))
    )

    return Array.from(new Set(testFiles.flat()))
  }

  private async collectPatternTestFiles(
    cwd: string,
    folderPattern: string,
    type: TestType,
    target: CommandTarget
  ): Promise<Array<string>> {
    const discoveryOptions = {
      cwd: toPortableCwd(cwd),
      dot: true,
      ignore: ['**/node_modules/**', '**/dist/**', '**/.yarn/**'],
    }

    let targetPath

    try {
      targetPath = await this.findExistingTargetPath(target)
    } catch (error) {
      if (isMissingPathError(error)) {
        if (this.isGlobPattern(target.request)) {
          return this.collectGlobPatternTestFiles(cwd, target.request)
        }

        if (this.isFilename(target.request)) {
          return toNativeFiles(
            await discoverFiles({
              ...discoveryOptions,
              patterns: [`**/${folderPattern}/*${target.request}*.test.{ts,tsx,js,jsx}`],
            })
          )
        }

        throw new Error(`Test target does not exist: ${target.request}`)
      }

      throw error
    }

    if (targetPath.stat.isDirectory()) {
      return toNativeFiles(
        await discoverFiles({
          ...discoveryOptions,
          cwd: toPortablePath(targetPath.path),
          patterns: this.createDirectoryTargetPatterns(folderPattern, type, targetPath.path),
        })
      )
    }

    return [targetPath.path]
  }

  private async collectGlobPatternTestFiles(cwd: string, pattern: string): Promise<Array<string>> {
    const files = await discoverFiles({
      cwd: toPortableCwd(cwd),
      patterns: [pattern],
      ignore: ['**/node_modules/**', '**/dist/**', '**/.yarn/**'],
      dot: true,
    })

    if (files.length > 0 || cwd === this.projectCwd) {
      return toNativeFiles(files)
    }

    return toNativeFiles(
      await discoverFiles({
        cwd: toPortableCwd(this.projectCwd),
        patterns: [pattern],
        ignore: ['**/node_modules/**', '**/dist/**', '**/.yarn/**'],
        dot: true,
      })
    )
  }

  private async findExistingTargetPath(target: CommandTarget): Promise<ExistingTargetPath> {
    const targetPaths = this.createTargetPaths(target)
    const targetResults = await Promise.all(
      targetPaths.map(async (targetPath): Promise<TargetPathResult> => {
        try {
          return {
            path: targetPath,
            stat: await stat(targetPath),
          }
        } catch (error) {
          return { error }
        }
      })
    )
    const existingTarget = targetResults.find(isExistingTargetPath)

    if (existingTarget) {
      return existingTarget
    }

    const unexpectedTarget = targetResults.find(
      (result): result is MissingTargetPath =>
        'error' in result && !isMissingPathError(result.error)
    )

    if (unexpectedTarget) {
      throw unexpectedTarget.error
    }

    for (const targetResult of targetResults) {
      if ('error' in targetResult) {
        throw targetResult.error
      }
    }

    throw new Error(`Test target does not exist: ${target.request}`)
  }

  private createTargetPaths(target: CommandTarget): Array<string> {
    const cwdTargetPath = toNativePath(target.path)
    const projectTargetPath = resolvePath(this.projectCwd, target.request)

    return cwdTargetPath === projectTargetPath
      ? [cwdTargetPath]
      : [cwdTargetPath, projectTargetPath]
  }

  private isFilename(pattern: string): boolean {
    const hasPathSeparator = pattern.includes('/') || pattern.includes('\\')

    const hasValidExtension = /\.(js|jsx|ts|tsx)$/.test(pattern)

    return !hasPathSeparator && !hasValidExtension
  }

  private isGlobPattern(pattern: string): boolean {
    return /[*?[\]{}]/.test(pattern)
  }

  private createDirectoryTargetPatterns(
    folderPattern: string,
    type: TestType,
    targetPath: string
  ): Array<string> {
    const directTestPattern = '*.test.{ts,tsx,js,jsx}'
    const nestedTestPattern = `**/${folderPattern}/${directTestPattern}`
    const targetFolder = basename(targetPath)

    if (type === undefined) {
      return [directTestPattern, `**/${directTestPattern}`]
    }

    if (type === 'integration') {
      return targetFolder === 'integration'
        ? [directTestPattern, nestedTestPattern]
        : [nestedTestPattern]
    }

    return targetFolder === 'integration'
      ? [nestedTestPattern]
      : [directTestPattern, nestedTestPattern]
  }

  private getProjectIgnorePatterns(): Array<string> {
    // eslint-disable-next-line n/no-sync
    const content = readFileSync(join(this.cwd, 'package.json'), 'utf-8')

    const { testIgnorePatterns = [] } = JSON.parse(content)

    return testIgnorePatterns as Array<string>
  }
}
