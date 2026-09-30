import { watch as watchDirectory } from 'node:fs/promises'
import { Writable }                from 'node:stream'
import { setImmediate }            from 'node:timers/promises'

import { createCommandInput }      from '@atls/raijin/commands'
import { toPortableCwd }           from '@atls/raijin/commands'

import { testProject }             from '../project/index.js'

const cwd = process.env.RAIJIN_TEST_FIXTURE_CWD

if (!cwd) {
  throw new Error('RAIJIN_TEST_FIXTURE_CWD is required')
}

const targets = JSON.parse(process.env.RAIJIN_TEST_FIXTURE_TARGETS ?? '[]') as Array<string>
const requestedReporter = process.env.RAIJIN_TEST_FIXTURE_REPORTER
const reporter = (['spec', 'tap', 'silent'] as const).find((value) => value === requestedReporter)
const provideOutput = process.env.RAIJIN_TEST_FIXTURE_OUTPUT !== 'false'
const watch = process.env.RAIJIN_TEST_FIXTURE_WATCH === 'true'
const observeCycle = process.env.RAIJIN_TEST_FIXTURE_CYCLE === 'true'
const controller = watch || observeCycle ? new AbortController() : undefined
const abortTimer = controller
  ? setTimeout(() => {
      controller.abort()
    }, 5_000)
  : undefined
const changes =
  controller && !observeCycle ? watchDirectory(cwd, { signal: controller.signal }) : undefined
const cycle = Promise.withResolvers<undefined>()
let report = ''
const output = observeCycle
  ? new Writable({
      write(chunk: Buffer, _encoding, callback) {
        report += chunk.toString()
        process.stdout.write(chunk)
        if (/^# duration_ms .+\n/m.test(report)) {
          cycle.resolve(undefined)
        }

        callback()
      },
    })
  : process.stdout
const readiness = observeCycle
  ? cycle.promise
  : changes &&
    (async () => {
      for await (const { filename } of changes) {
        if (filename === 'watch-ready') {
          return
        }
      }

      throw new Error('Watch did not report the fixture readiness marker')
    })()
const observation = { settled: false }
const completion = testProject({
  rootCwd: cwd,
  cwd,
  input: createCommandInput({
    cwd: toPortableCwd(cwd),
    source: targets.length > 0 ? 'explicit' : 'generated',
    targets,
  }),
  ...(reporter ? { reporter } : {}),
  ...(controller ? { signal: controller.signal } : {}),
  scenario: 'unit',
  ...(provideOutput && reporter !== 'silent' ? { stdout: output } : {}),
  watch,
}).finally(() => {
  observation.settled = true
})

try {
  if (controller && readiness) {
    await Promise.race([
      completion.then(() => {
        throw new Error('Watch completed before the controlled abort')
      }),
      readiness,
    ])

    if (observeCycle) {
      await setImmediate()
      if (observation.settled) {
        throw new Error('Watch completed before the controlled abort')
      }
    }

    if (controller.signal.aborted) {
      throw new Error('Watch reached the fixture deadline before the controlled abort')
    }

    process.stdout.write('\n__RAIJIN_TEST_ABORT__\n')
    controller.abort()
  }

  const result = await completion

  process.stdout.write(`\n__RAIJIN_TEST_RESULT__${JSON.stringify(result)}\n`)
} finally {
  if (abortTimer) {
    clearTimeout(abortTimer)
  }

  controller?.abort()
  await changes?.return?.()
  if (observeCycle) {
    output.destroy()
  }
}
