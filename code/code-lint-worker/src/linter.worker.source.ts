import { workerData } from 'node:worker_threads'
import { parentPort } from 'node:worker_threads'

import { Linter }     from '@atls/code-lint'

new Linter(workerData.cwd)
  .lint(workerData.files)
  .then((results) => parentPort!.postMessage(results))
