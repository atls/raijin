import { parentPort } from 'node:worker_threads'
import { workerData } from 'node:worker_threads'

import { Icons }      from '@atls/code-icons'

await new Icons(workerData.cwd as string).generate()

parentPort!.postMessage('')
