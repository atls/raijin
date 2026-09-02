import { watch as watchDirectory } from 'node:fs/promises'
import { setTimeout as delay }     from 'node:timers/promises'

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
const controller = watch ? new AbortController() : undefined
const abortTimer = controller
  ? setTimeout(() => {
      controller.abort()
    }, 5_000)
  : undefined
const changes = controller ? watchDirectory(cwd, { signal: controller.signal }) : undefined
const readiness = changes?.next()
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
  ...(provideOutput && reporter !== 'silent' ? { stdout: process.stdout } : {}),
  watch,
})

try {
  if (controller && readiness) {
    await Promise.race([
      completion.then(() => {
        throw new Error('Watch completed before the controlled abort')
      }),
      readiness.then(async ({ done, value }) => {
        if (done || value.filename !== 'watch-ready') {
          throw new Error('Watch did not report the fixture readiness marker')
        }

        await delay(100)
      }),
    ])

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
}
