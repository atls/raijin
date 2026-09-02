import type { EventData } from 'node:test'

import { isAbsolute }     from 'node:path'
import { resolve }        from 'node:path'

const resolveEventFile = (file: string | undefined, rootCwd: string): string | undefined =>
  file && !isAbsolute(file) ? resolve(rootCwd, file) : file

export const normalizeFailure = (
  failure: EventData.TestFail,
  rootCwd: string
): EventData.TestFail => ({
  ...failure,
  file: resolveEventFile(failure.file, rootCwd),
})

export const normalizeStderr = (
  stderr: EventData.TestStderr,
  rootCwd: string
): EventData.TestStderr => ({
  ...stderr,
  file: resolveEventFile(stderr.file, rootCwd) ?? stderr.file,
})
