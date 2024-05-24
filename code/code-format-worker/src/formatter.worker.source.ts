import { parentPort } from 'node:worker_threads'
import { workerData } from 'node:worker_threads'

import { Formatter }  from '@atls/code-format'

await new Formatter(workerData.cwd as string).format(workerData.files as Array<string>)

parentPort!.postMessage('')
