import type { EventData }            from 'node:test'
import type { TestEvent }            from 'node:test/reporters'

import EventEmitter                  from 'node:events'
import { readFileSync }              from 'node:fs'
import { stat }                      from 'node:fs/promises'
/* eslint-disable @typescript-eslint/member-ordering */
import { relative }                  from 'node:path'
import { resolve as resolvePath }    from 'node:path'
import { join }                      from 'node:path'
import { run }                       from 'node:test'
import { tap }                       from 'node:test/reporters'

import { globby }                    from 'globby'
import ignorer                       from 'ignore'

import { Tests }                     from './tests.js'
import { parseTestExecArgv }         from './test-exec-argv.js'
import { createTestRuntimeExecArgv } from './test-exec-argv.js'

export type TestsStream = ReturnType<typeof run>

type TestFail = EventData.TestFail
type TestPass = EventData.TestPass
type TestStderr = EventData.TestStderr
type TestStdout = EventData.TestStdout
type TestSummary = EventData.TestSummary

type TestOptions = {
  files?: Array<string>
  watch?: boolean
  testReporter?: string
}

const TEST_STREAM_KEEP_ALIVE_INTERVAL = 1000

const createTestEvent = <T>(type: string, data: T): TestEvent => ({ type, data }) as TestEvent

const isFinalSummary = (data: TestSummary): boolean => !data.file

const hasReporterFailures = (output: string): boolean =>
  output.includes('\nnot ok ') || /# (?:fail|cancelled) [1-9]\d*/.test(output)

export class Tester extends EventEmitter {
  private ignore: ignorer.Ignore

  constructor(private readonly cwd: string) {
    super()

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

  static async initialize(cwd: string): Promise<Tester> {
    return new Tester(cwd)
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

  async unit(cwd: string, options?: TestOptions): Promise<Array<TestEvent>> {
    const testFiles = await this.collectTestFiles(cwd, 'unit', options?.files)

    const finalFiles = testFiles.filter(
      (file) => this.ignore.filter([relative(this.cwd, file)]).length !== 0
    )

    return this.run(finalFiles, 240_000, true, options?.watch, options?.testReporter)
  }

  async integration(cwd: string, options?: TestOptions): Promise<Array<TestEvent>> {
    const testFiles = await this.collectTestFiles(cwd, 'integration', options?.files)

    const finalFiles = testFiles.filter(
      (file) => this.ignore.filter([relative(this.cwd, file)]).length !== 0
    )

    return this.run(finalFiles, 420_000, false, options?.watch, options?.testReporter)
  }

  async general(cwd: string, options?: TestOptions): Promise<Array<TestEvent>> {
    const testFiles = await this.collectTestFiles(cwd, undefined, options?.files)

    const finalFiles = testFiles.filter(
      (file) => this.ignore.filter([relative(this.cwd, file)]).length !== 0
    )

    return this.run(finalFiles, 420_000, true, options?.watch, options?.testReporter)
  }

  private async collectTestFiles(
    cwd: string,
    type: 'integration' | 'unit' | undefined,
    patterns: Array<string> | undefined
  ): Promise<Array<string>> {
    let folderPattern = '*'
    if (type !== undefined) {
      folderPattern = type === 'unit' ? '!(integration)' : 'integration'
    }

    if (!patterns || patterns.length < 1) {
      return globby([`**/${folderPattern}/*.test.{ts,tsx,js,jsx}`], {
        cwd,
        dot: true,
        absolute: true,
        ignore: ['**/node_modules/**', '**/dist/**', '**/.yarn/**'],
      })
    }

    const testFiles = await Promise.all(
      patterns.map(async (pattern) => this.collectPatternTestFiles(cwd, folderPattern, pattern))
    )

    return Array.from(new Set(testFiles.flat()))
  }

  private async collectPatternTestFiles(
    cwd: string,
    folderPattern: string,
    pattern: string
  ): Promise<Array<string>> {
    const globbyOptions = {
      cwd,
      dot: true,
      absolute: true,
      ignore: ['**/node_modules/**', '**/dist/**', '**/.yarn/**'],
    }

    const targetPath = resolvePath(cwd, pattern)
    let targetStat

    try {
      targetStat = await stat(targetPath)
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        if (this.isGlobPattern(pattern)) {
          return globby([pattern], globbyOptions)
        }

        if (this.isFilename(pattern)) {
          return globby([`**/${folderPattern}/*${pattern}*.test.{ts,tsx,js,jsx}`], globbyOptions)
        }

        throw new Error(`Test target does not exist: ${pattern}`)
      }

      throw error
    }

    if (targetStat.isDirectory()) {
      return globby([`**/${folderPattern}/*.test.{ts,tsx,js,jsx}`], {
        ...globbyOptions,
        cwd: targetPath,
      })
    }

    return [targetPath]
  }

  private isFilename(pattern: string): boolean {
    const hasPathSeparator = pattern.includes('/') || pattern.includes('\\')

    const hasValidExtension = /\.(js|jsx|ts|tsx)$/.test(pattern)

    return !hasPathSeparator && !hasValidExtension
  }

  private isGlobPattern(pattern: string): boolean {
    return /[*?[\]{}]/.test(pattern)
  }

  private getProjectIgnorePatterns(): Array<string> {
    // eslint-disable-next-line n/no-sync
    const content = readFileSync(join(this.cwd, 'package.json'), 'utf-8')

    const { testIgnorePatterns = [] } = JSON.parse(content)

    return testIgnorePatterns as Array<string>
  }
}
