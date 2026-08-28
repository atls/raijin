import type { ProjectTestEvent } from '../project/event.js'
import type { TestRunInput }     from '../project/ports/child.js'

export const TEST_EXECUTION_CHANNEL = '@atls/raijin:test-execution:v1'
export const TEST_PRODUCER_PATH = ['raijin', 'test', 'producer'] as const

export type TestProducerInput = TestRunInput

export interface TestProducerRequest {
  channel: typeof TEST_EXECUTION_CHANNEL
  input: TestProducerInput
  type: 'execute'
}

export type TestProducerMessage =
  | {
      channel: typeof TEST_EXECUTION_CHANNEL
      error: {
        message: string
        stack?: string
      }
      type: 'failed'
    }
  | {
      channel: typeof TEST_EXECUTION_CHANNEL
      event: ProjectTestEvent
      type: 'event'
    }
  | {
      channel: typeof TEST_EXECUTION_CHANNEL
      type: 'completed'
    }

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isStringArray = (value: unknown): value is Array<string> =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')

const isProducerInput = (value: unknown): value is TestProducerInput =>
  isObject(value) &&
  typeof value.concurrency === 'boolean' &&
  isStringArray(value.execArgv) &&
  isStringArray(value.files) &&
  typeof value.projectCwd === 'string' &&
  (value.reporter === 'silent' || value.reporter === 'spec' || value.reporter === 'tap') &&
  typeof value.testTimeoutMs === 'number' &&
  typeof value.watch === 'boolean'

export const isTestProducerRequest = (value: unknown): value is TestProducerRequest =>
  isObject(value) &&
  value.channel === TEST_EXECUTION_CHANNEL &&
  value.type === 'execute' &&
  isProducerInput(value.input)

export const isTestProducerMessage = (value: unknown): value is TestProducerMessage => {
  if (!isObject(value) || value.channel !== TEST_EXECUTION_CHANNEL) {
    return false
  }

  if (value.type === 'completed') {
    return true
  }

  if (value.type === 'event') {
    return isObject(value.event) && typeof value.event.type === 'string' && 'data' in value.event
  }

  return value.type === 'failed' && isObject(value.error) && typeof value.error.message === 'string'
}
