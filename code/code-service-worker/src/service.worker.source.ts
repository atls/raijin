import type { webpack } from '@atls/code-runtime/webpack'

import { parentPort }   from 'node:worker_threads'
import { workerData }   from 'node:worker_threads'

import { Service }      from '@atls/code-service'

const { environment, cwd }: { environment: 'development' | 'production'; cwd: string } = workerData

const waitSignals = async (watcher: webpack.Watching): Promise<void> =>
  new Promise((resolve) => {
    process.on('SIGINT', () => {
      watcher.close(() => {
        resolve()
      })
    })

    process.on('SIGTERM', () => {
      watcher.close(() => {
        resolve()
      })
    })
  })

const execute = async (): Promise<void> => {
  if (environment === 'production') {
    parentPort!.postMessage(await new Service(cwd).build())
  }

  if (environment === 'development') {
    const watcher = await new Service(cwd).watch((message) => {
      parentPort!.postMessage(message)
    })

    await waitSignals(watcher)
  }
}

await execute()
