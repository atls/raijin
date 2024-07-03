import { writeFile }            from 'node:fs/promises'
import { access }               from 'node:fs/promises'
import { mkdir }                from 'node:fs/promises'
import { join }                 from 'node:path'
import { dirname }              from 'node:path'
import { Worker }               from 'node:worker_threads'

import { fastHashCode as hash } from 'fast-hash-code'

export class EvalWorker {
  static async run<T>(cwd: string, content: string, workerData: object): Promise<T> {
    const worker = await EvalWorker.build(cwd, content, workerData)

    return new Promise((resolve, reject) => {
      const exitHandler = (code: number): void => {
        if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`))
      }

      worker.once('message', (result: T) => {
        worker.off('error', reject)
        worker.off('exit', exitHandler)

        resolve(result)
      })

      worker.once('error', reject)
      worker.once('exit', exitHandler)
    })
  }

  static async watch<T>(
    cwd: string,
    content: string,
    workerData: object,
    callback: (logRecord: T) => void
  ): Promise<void> {
    const worker = await EvalWorker.build(cwd, content, workerData)

    return new Promise((resolve, reject) => {
      const stdinHandler = (data: Buffer): void => {
        if (worker.stdin) {
          worker.stdin.write(data)
        }
      }

      const exitHandler = (code: number): void => {
        process.stdin.off('data', stdinHandler)

        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`))
        } else {
          resolve()
        }
      }

      process.stdin.on('data', stdinHandler)

      worker.on('message', callback)

      worker.once('error', reject)
      worker.once('exit', exitHandler)
    })
  }

  private static async build(cwd: string, content: string, workerData: object): Promise<Worker> {
    const filename: number = hash(content, { forcePositive: true })
    const file: string = join(cwd, `.yarn/dist/${filename}.mjs`)

    try {
      try {
        await access(dirname(file))
      } catch {
        await mkdir(dirname(file), { recursive: true })
      }

      await access(file)
    } catch {
      await writeFile(file, content)
    }

    const execArgv: Array<string> = []

    this.silenceWarnings(execArgv)

    try {
      await access(join(cwd, '.pnp.cjs'))

      execArgv.push('--require')
      execArgv.push(join(cwd, '.pnp.cjs'))
    } catch {} // eslint-disable-line no-empty

    try {
      await access(join(cwd, '.pnp.cjs'))

      execArgv.push('--loader')
      execArgv.push(join(cwd, '.pnp.loader.mjs'))
    } catch {} // eslint-disable-line no-empty

    return new Worker(file, {
      execArgv: [...execArgv, ...process.execArgv],
      workerData,
      env: process.env,
      stdin: true,
    })
  }

  private static silenceWarnings(args: Array<string>) {
    const noWarnings = '--no-warnings='

    const experimentalWarnings = 'ExperimentalWarning'

    args.push(noWarnings + experimentalWarnings)
  }
}
