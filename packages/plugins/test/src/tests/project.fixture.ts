import { createCommandInput } from '@atls/raijin/commands'
import { toPortableCwd }      from '@atls/raijin/commands'

import { testProject }        from '../project.js'

const cwd = process.env.RAIJIN_TEST_FIXTURE_CWD

if (!cwd) {
  throw new Error('RAIJIN_TEST_FIXTURE_CWD is required')
}

const targets = JSON.parse(process.env.RAIJIN_TEST_FIXTURE_TARGETS ?? '[]') as Array<string>
const reporter = process.env.RAIJIN_TEST_FIXTURE_REPORTER === 'tap' ? 'tap' : 'silent'
const watch = process.env.RAIJIN_TEST_FIXTURE_WATCH === 'true'
const controller = watch ? new AbortController() : undefined
const abortTimer = controller
  ? setTimeout(() => {
      controller.abort()
    }, 500)
  : undefined
const result = await testProject({
  rootCwd: cwd,
  cwd,
  input: createCommandInput({
    cwd: toPortableCwd(cwd),
    source: targets.length > 0 ? 'explicit' : 'generated',
    targets,
  }),
  reporter,
  ...(controller ? { signal: controller.signal } : {}),
  scenario: 'unit',
  ...(reporter === 'tap' ? { stdout: process.stdout } : {}),
  watch,
})

if (abortTimer) {
  clearTimeout(abortTimer)
}

process.stdout.write(`\n__RAIJIN_TEST_RESULT__${JSON.stringify(result)}\n`)
