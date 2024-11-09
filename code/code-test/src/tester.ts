import type { TestEvent } from 'node:test/reporters'

import EventEmitter       from 'node:events'
import { run }            from 'node:test'

import { globby }         from 'globby'

import { Tests }          from './tests.js'

export type TestsStream = ReturnType<typeof run>

export class Tester extends EventEmitter {
  constructor() {
    super()
  }

  static async initialize(): Promise<Tester> {
    return new Tester()
  }

  async unit(cwd: string): Promise<Array<TestEvent>> {
    return this.run(
      await globby(['**/!(integration)/*.test.{ts,tsx,js,jsx}'], {
        cwd,
        dot: true,
        absolute: true,
        ignore: ['**/node_modules/**', '**/dist/**'],
      }),
      25_000,
      true
    )
  }

  async integration(cwd: string): Promise<Array<TestEvent>> {
    return this.run(
      await globby(['**/integration/**/*.test.{ts,tsx,js,jsx}'], {
        cwd,
        dot: true,
        absolute: true,
        ignore: ['**/node_modules/**', '**/dist/**'],
      }),
      240_000,
      false
    )
  }

  protected async run(
    files: Array<string>,
    timeout: number,
    concurrency: boolean
  ): Promise<Array<TestEvent>> {
    const tests = await Tests.load(files)

    this.emit('start', { tests })

    const testsStream = run({
      files,
      timeout,
      concurrency,
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
