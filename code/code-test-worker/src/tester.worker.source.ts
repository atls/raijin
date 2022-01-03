import { parentPort } from 'node:worker_threads'
import { workerData } from 'node:worker_threads'

import { Tester }     from '@atls/code-test'

const { type, cwd, options, files = [] } = workerData

const tester = new Tester(cwd)

if (type === 'unit') {
  tester.unit(options, files).then((results) => {
    parentPort!.postMessage(results)
    process.exit(0)
  })
} else {
  tester.integration(options, files).then((results) => {
    parentPort!.postMessage(results)
    process.exit(0)
  })
}
