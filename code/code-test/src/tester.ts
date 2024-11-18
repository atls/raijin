import type { TestEvent } from 'node:test/reporters'

import EventEmitter       from 'node:events'
import { run }            from 'node:test'

import { globby }         from 'globby'

import { Tests }          from './tests.js'

export type TestsStream = ReturnType<typeof run>

type TestOptions = {
  files?: Array<string>
  watch?: boolean
}

export class Tester extends EventEmitter {
  constructor() {
    super()
  }

  static async initialize(): Promise<Tester> {
    return new Tester()
  }

  private async collectTestFiles(
    cwd: string,
    type: 'integration' | 'unit',
    patterns: Array<string> | undefined
  ) {
    const folderPattern = type === 'unit' ? '!(integration)' : 'integration'

    if (!patterns || patterns.length < 1) {
      return await globby([`**/${folderPattern}/*.test.{ts,tsx,js,jsx}`], {
        cwd,
        dot: true,
        absolute: true,
        ignore: ['**/node_modules/**', '**/dist/**', '**/.yarn/**'],
      })
    }

    return await globby(
      patterns.map((pattern) => {
        return `**/${folderPattern}/*${pattern}*.test.{ts,tsx,js,jsx}`
      }),
      {
        cwd,
        dot: true,
        absolute: true,
        ignore: ['**/node_modules/**', '**/dist/**', '**/.yarn/**'],
      }
    )
  }

  async unit(cwd: string, options?: TestOptions): Promise<Array<TestEvent>> {
    const testFiles = await this.collectTestFiles(cwd, 'unit', options?.files)

    return this.run(testFiles, 25_000, true, options?.watch ?? false)
  }

  async integration(cwd: string, options?: TestOptions): Promise<Array<TestEvent>> {
    const testFiles = await this.collectTestFiles(cwd, 'integration', options?.files)

    return this.run(testFiles, 240_000, false, options?.watch ?? false)
  }

  protected async run(
    files: Array<string>,
    timeout: number,
    concurrency: boolean,
    watch: boolean
  ): Promise<Array<TestEvent>> {
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
}
