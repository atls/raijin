import type { EventData } from 'node:test'

import { isAbsolute }     from 'node:path'
import { resolve }        from 'node:path'

const resolveFile = (file: string | undefined, rootCwd: string): string | undefined =>
  file && !isAbsolute(file) ? resolve(rootCwd, file) : file

export const normalizeFailureFile = (
  failure: EventData.TestFail,
  rootCwd: string
): EventData.TestFail => ({
  ...failure,
  file: resolveFile(failure.file, rootCwd),
})

export const normalizeStderrFile = (
  stderr: EventData.TestStderr,
  rootCwd: string
): EventData.TestStderr => ({
  ...stderr,
  file: resolveFile(stderr.file, rootCwd) ?? stderr.file,
})
