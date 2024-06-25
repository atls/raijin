import { parentPort } from 'node:worker_threads'
import { workerData } from 'node:worker_threads'

import { Linter }     from '@atls/code-lint'

parentPort!.postMessage(
  await new Linter(workerData.cwd as string, workerData.rootCwd as string).lint(
    workerData.files as Array<string>,
    workerData.options as object
  )
)
