import { parentPort } from 'node:worker_threads'
import { workerData } from 'node:worker_threads'
import { setTimeout } from 'node:timers/promises'
import { exit }       from 'node:process'

import { stringify }  from 'flatted'
import { parse }      from 'flatted'

import { Tester }     from '@atls/code-test'

const {
  type,
  cwd,
  options,
  files = [],
}: { type: 'integration' | 'unit'; cwd: string; options: object; files: Array<string> } = workerData

const execute = async (): Promise<void> => {
  if (type === 'unit') {
    parentPort!.postMessage(parse(stringify(await new Tester(cwd).unit(options, files))))
  }

  if (type === 'integration') {
    parentPort!.postMessage(parse(stringify(await new Tester(cwd).integration(options, files))))
  }
}

await execute()
await setTimeout(100)

exit(0)
