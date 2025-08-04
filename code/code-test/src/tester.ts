import type { TestEvent } from 'node:test/reporters'

import EventEmitter       from 'node:events'
import { readFileSync }   from 'node:fs'
/* eslint-disable @typescript-eslint/member-ordering */
import { relative }       from 'node:path'
import { join }           from 'node:path'
import { run }            from 'node:test'
import { tap }            from 'node:test/reporters'

import { globby }         from 'globby'
import ignorer            from 'ignore'

import { Tests }          from './tests.js'

export type TestsStream = ReturnType<typeof run>

type TestOptions = {
  files?: Array<string>
  watch?: boolean
  testReporter?: string
}

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
    if (testReporter === 'tap') {
      const result = run({
        files,
        timeout,
        concurrency,
        watch,
      }).compose(tap)

      result.pipe(process.stdout)

      // @ts-expect-error toArray is missing
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
      return result.toArray()
    }

    const tests = await Tests.load(files)

    this.emit('start', { tests })

    const testsStream = run({
      files,
      timeout,
      concurrency,
      watch,
    })

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
      return (await testsStream.toArray()) as Array<TestEvent>
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

    return globby(
      patterns.map((pattern) => {
        if (this.isFilename(pattern)) {
          return `**/${folderPattern}/*${pattern}*.test.{ts,tsx,js,jsx}`
        }

        if (this.isRootPath(pattern)) {
          return pattern
        }

        return `**/${pattern}`
      }),
      {
        cwd,
        dot: true,
        absolute: true,
        ignore: ['**/node_modules/**', '**/dist/**', '**/.yarn/**'],
      }
    )
  }

  private isFilename(pattern: string): boolean {
    const hasPathSeparator = pattern.includes('/') || pattern.includes('\\')

    const hasValidExtension = /\.(js|jsx|ts|tsx)$/.test(pattern)

    return !hasPathSeparator && !hasValidExtension
  }

  private isRootPath(pattern: string): boolean {
    return pattern.startsWith('/') || pattern.startsWith('\\')
  }

  private getProjectIgnorePatterns(): Array<string> {
    // eslint-disable-next-line n/no-sync
    const content = readFileSync(join(this.cwd, 'package.json'), 'utf-8')

    const { testIgnorePatterns = [] } = JSON.parse(content)

    return testIgnorePatterns as Array<string>
  }
}
