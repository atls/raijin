import type { TestEvent }       from 'node:test/reporters'

import type { Annotation }      from './github.checks.js'
import type { AnnotationLevel } from './github.checks.js'

import { relative }             from 'node:path'

const DEFAULT_LINE = 1
const FAILURE_ANNOTATION_LEVEL = 'failure' as AnnotationLevel

const GENERIC_TEST_FAILURE_MESSAGES = new Set(['test failed'])

const ERROR_TITLE_PREFIXES = [
  'Error',
  'AssertionError',
  'TypeError:',
  'SyntaxError:',
  'ReferenceError:',
  'RangeError:',
]

type ErrorLike = {
  message?: unknown
  stack?: unknown
  cause?: unknown
}

type TestStderrData = {
  file?: string
  message?: string
}

const isErrorLike = (value: unknown): value is ErrorLike =>
  typeof value === 'object' && value !== null

const getText = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined

const getMessage = (error: unknown): string | undefined => {
  if (!isErrorLike(error)) {
    return getText(error)
  }

  return getText(error.message)
}

const getStack = (error: unknown): string | undefined => {
  if (!isErrorLike(error)) {
    return undefined
  }

  return getText(error.stack)
}

const findRootError = (error: unknown): unknown => {
  if (!isErrorLike(error) || error.cause === undefined) {
    return error
  }

  const cause = findRootError(error.cause)
  const causeMessage = getMessage(cause)

  if (causeMessage && !GENERIC_TEST_FAILURE_MESSAGES.has(causeMessage)) {
    return cause
  }

  return error
}

const collectStderrByFile = (events: Array<TestEvent>): Map<string, string> =>
  events.reduce((stderrByFile, event) => {
    if (event.type !== 'test:stderr') {
      return stderrByFile
    }

    const { file, message } = event.data as TestStderrData

    if (file && message) {
      stderrByFile.set(file, `${stderrByFile.get(file) ?? ''}${message}`)
    }

    return stderrByFile
  }, new Map<string, string>())

const getStderrTitle = (stderr: string | undefined): string | undefined => {
  if (!stderr) {
    return undefined
  }

  const lines = stderr
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  return lines.find((line) => ERROR_TITLE_PREFIXES.some((prefix) => line.startsWith(prefix)))
}

const getAnnotationTitle = (error: unknown, stderr: string | undefined): string => {
  const rootError = findRootError(error)
  const rootMessage = getMessage(rootError)
  const stderrTitle = getStderrTitle(stderr)

  if (stderrTitle && (!rootMessage || GENERIC_TEST_FAILURE_MESSAGES.has(rootMessage))) {
    return stderrTitle
  }

  return rootMessage ?? getMessage(error) ?? 'Test failed'
}

const getAnnotationDetails = (error: unknown, stderr: string | undefined): string => {
  if (stderr) {
    return stderr.trim()
  }

  const rootError = findRootError(error)

  return (
    getStack(rootError) ??
    getMessage(rootError) ??
    getStack(error) ??
    getMessage(error) ??
    'Test failed'
  )
}

export const formatTestResults = (
  results: Array<TestFail>,
  cwd: string,
  events: Array<TestEvent> = []
): Array<Annotation> => {
  const stderrByFile = collectStderrByFile(events)

  return results.map((result) => {
    const stderr = result.file ? stderrByFile.get(result.file) : undefined
    const title = getAnnotationTitle(result.details.error, stderr)
    const line = result.line ?? DEFAULT_LINE

    return {
      path: result.file ? relative(cwd, result.file) : cwd,
      start_line: line,
      end_line: line,
      annotation_level: FAILURE_ANNOTATION_LEVEL,
      raw_details: getAnnotationDetails(result.details.error, stderr),
      title,
      message: title,
    }
  })
}
