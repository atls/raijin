import { writeFileSync } from 'node:fs'
import { existsSync }    from 'node:fs'
import { mkdirSync }     from 'node:fs'
import { join }          from 'node:path'
import { dirname }       from 'node:path'
import { Worker }        from 'node:worker_threads'

export class EvalWorker {
  private static build(content: string, workerData: object): Worker {
    const file = join(process.cwd(), '.yarn/dist/worker.mjs')

    const execArgv: Array<string> = []

    if (existsSync(join(process.cwd(), '.pnp.cjs'))) {
      execArgv.push('--require')
      execArgv.push(join(process.cwd(), '.pnp.cjs'))
    }

    if (existsSync(join(process.cwd(), '.pnp.loader.mjs'))) {
      execArgv.push('--loader')
      execArgv.push(join(process.cwd(), '.pnp.loader.mjs'))
    }

    if (!existsSync(dirname(file))) {
      mkdirSync(dirname(file))
    }

    writeFileSync(file, content)

    return new Worker(file, {
      execArgv: [...execArgv, ...process.execArgv],
      workerData,
      env: process.env,
    })
  }

  static async run<T>(content: string, workerData: object): Promise<T> {
    return new Promise((resolve, reject) => {
      const worker = EvalWorker.build(content, workerData)

      const exitHandler = (code: number) => {
        if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`))
      }

      worker.once('message', (result) => {
        worker.off('error', reject)
        worker.off('exit', exitHandler)

        resolve(result)
      })

      worker.once('error', reject)
      worker.once('exit', exitHandler)
    })
  }

  static async watch(content: string, workerData: object, onMessage) {
    return new Promise((resolve, reject) => {
      const worker = EvalWorker.build(content, workerData)

      const exitHandler = (code: number) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`))
        } else {
          resolve(null)
        }
      }

      worker.on('message', onMessage)

      worker.once('error', reject)
      worker.once('exit', exitHandler)
    })
  }
}
