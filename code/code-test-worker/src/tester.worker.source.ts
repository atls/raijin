import { exit }       from 'node:process'
import { setTimeout } from 'node:timers/promises'
import { parentPort } from 'node:worker_threads'
import { workerData } from 'node:worker_threads'

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
  const results =
    type === 'unit'
      ? await new Tester(cwd).unit(options, files)
      : await new Tester(cwd).integration(options, files)

  try {
    parentPort!.postMessage(results)
  } catch {
    parentPort!.postMessage(
      parse(
        stringify(results, (_, value: unknown): unknown =>
          typeof value === 'bigint' ? value.toString() : value)
      )
    )
  }
}

await execute()
await setTimeout(180)

exit(0)
