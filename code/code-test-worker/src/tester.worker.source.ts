import { parentPort } from 'node:worker_threads'
import { workerData } from 'node:worker_threads'

import { Tester }     from '@atls/code-test'

const { type, cwd, options, files = [] } = workerData

const tester = new Tester(cwd)

const tests = type === 'unit' ? tester.unit(options, files) : tester.integration(options, files)

tests
  .then((results) => parentPort!.postMessage(results))
  .then(() => {
    setTimeout(() => {
      process.exit(0)
    }, 100)
  })
