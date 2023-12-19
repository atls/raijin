import { parentPort } from 'node:worker_threads'
import { workerData } from 'node:worker_threads'

import { Service }    from '@atls/code-service-new'

const { environment, cwd } = workerData

const service = new Service(cwd)

const waitSignals = (watcher): Promise<void> =>
  new Promise((resolve) => {
    process.on('SIGINT', () => {
      watcher.close(() => resolve())
    })

    process.on('SIGTERM', () => {
      watcher.close(() => resolve())
    })
  })

const execute = async () => {
  if (environment === 'production') {
    parentPort!.postMessage(await service.build())
  }

  if (environment === 'development') {
    const watcher = await service.watch((message) => parentPort!.postMessage(message))

    await waitSignals(watcher)
  }
}

execute()
