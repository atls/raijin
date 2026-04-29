import type { EventData }       from 'node:test'
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

type TestFail = EventData.TestFail

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

const isGenericFailureMessage = (message: string | undefined): boolean =>
  message === undefined || GENERIC_TEST_FAILURE_MESSAGES.has(message)

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

const collectFailureCountByFile = (results: Array<TestFail>): Map<string, number> =>
  results.reduce((failureCountByFile, result) => {
    if (!result.file) {
      return failureCountByFile
    }

    failureCountByFile.set(result.file, (failureCountByFile.get(result.file) ?? 0) + 1)

    return failureCountByFile
  }, new Map<string, number>())

const shouldUseStderr = (
  error: unknown,
  stderr: string | undefined,
  fileFailureCount: number
): boolean => {
  if (!stderr || fileFailureCount > 1) {
    return false
  }

  const rootError = findRootError(error)
  const rootMessage = getMessage(rootError)

  return isGenericFailureMessage(rootMessage) && getStderrTitle(stderr) !== undefined
}

const getAnnotationTitle = (error: unknown, stderr: string | undefined): string => {
  const rootError = findRootError(error)
  const rootMessage = getMessage(rootError)
  const stderrTitle = getStderrTitle(stderr)

  if (stderrTitle && isGenericFailureMessage(rootMessage)) {
    return stderrTitle
  }

  return rootMessage ?? getMessage(error) ?? 'Test failed'
}

const getAnnotationDetails = (error: unknown, stderr: string | undefined): string => {
  const rootError = findRootError(error)
  const rootMessage = getMessage(rootError)

  if (stderr && isGenericFailureMessage(rootMessage)) {
    return stderr.trim()
  }

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
  const failureCountByFile = collectFailureCountByFile(results)

  return results.map((result) => {
    const stderr = result.file ? stderrByFile.get(result.file) : undefined
    const fileFailureCount = result.file ? (failureCountByFile.get(result.file) ?? 0) : 0
    const scopedStderr = shouldUseStderr(result.details.error, stderr, fileFailureCount)
      ? stderr
      : undefined
    const title = getAnnotationTitle(result.details.error, scopedStderr)
    const line = result.line ?? DEFAULT_LINE

    return {
      path: result.file ? relative(cwd, result.file) : cwd,
      start_line: line,
      end_line: line,
      annotation_level: FAILURE_ANNOTATION_LEVEL,
      raw_details: getAnnotationDetails(result.details.error, scopedStderr),
      title,
      message: title,
    }
  })
}
