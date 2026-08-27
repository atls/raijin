import type { ManagedNodeExecuteResult } from '@atls/raijin/commands'

import type { InterruptedEvent }         from './event.js'
import type { ProjectTestEvent }         from './event.js'
import type { ProjectTestFailure }       from './event.js'
import type { ProjectTestPass }          from './event.js'
import type { ProjectTestSummary }       from './event.js'
import type { TestProducerMessage }      from './ipc.js'

import { isTestProducerMessage }         from './ipc.js'

export interface ProjectTestState {
  events: Array<ProjectTestEvent>
  failures: Array<ProjectTestFailure>
  interrupted: Array<InterruptedEvent['data']>
  passes: Array<ProjectTestPass>
  summary?: ProjectTestSummary
  watch: {
    drained: number
    lastTransition?: 'drained' | 'restarted'
    restarted: number
  }
}

export type ProjectTestProviderStage =
  | 'discovery'
  | 'managed-execution'
  | 'producer'
  | 'runtime-argv'

export interface ProjectTestProviderDetail {
  message: string
  stage: ProjectTestProviderStage
}

interface ResultBase {
  output: {
    stderr: string
    stdout: string
  }
  state: ProjectTestState
}

export type ProjectTestResult = ResultBase &
  (
    | {
        reason: 'provider-failed'
        detail: ProjectTestProviderDetail
        providerReason: string
      }
    | { reason: 'cancelled' }
    | { reason: 'cleanup-failed'; executionReason: string }
    | { reason: 'failed' }
    | { reason: 'interrupted' }
    | { reason: 'output-failed'; exitCode: number }
    | { reason: 'passed' }
    | { reason: 'timed-out' }
  )

export type ProjectTestOutcome = { exitCode: 0 } | { exitCode: 1; summary: string }

interface ProjectTestProviderFailureInput {
  cause: unknown
  output?: ResultBase['output']
  providerReason: string
  stage: ProjectTestProviderStage
  state?: ProjectTestState
}

interface ProtocolState {
  completed: boolean
  failure?: TestProducerMessage & { type: 'failed' }
  state: ProjectTestState
}

const createProjectTestState = (): ProjectTestState => ({
  events: [],
  failures: [],
  interrupted: [],
  passes: [],
  watch: {
    drained: 0,
    restarted: 0,
  },
})

const toFailureMessage = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause)

export const createProjectTestProviderFailure = ({
  cause,
  output = { stderr: '', stdout: '' },
  providerReason,
  stage,
  state = createProjectTestState(),
}: ProjectTestProviderFailureInput): ProjectTestResult => ({
  detail: {
    message: toFailureMessage(cause),
    stage,
  },
  output,
  providerReason,
  reason: 'provider-failed',
  state,
})

export const createProjectTestOutcome = (result: ProjectTestResult): ProjectTestOutcome => {
  if (result.reason === 'passed') {
    return { exitCode: 0 }
  }

  if (result.reason === 'failed') {
    const failed = result.state.failures.length

    return {
      exitCode: 1,
      summary: failed > 0 ? `Found ${failed} test failures` : 'Node test summary reported failure',
    }
  }

  if (result.reason === 'provider-failed') {
    return { exitCode: 1, summary: result.detail.message }
  }

  return { exitCode: 1, summary: `Test execution ended with ${result.reason}` }
}

const reduceMessages = (messages: ReadonlyArray<unknown>): ProtocolState => {
  const producerMessages = messages.filter(isTestProducerMessage)
  const events = producerMessages.flatMap((message) =>
    message.type === 'event' ? [message.event] : [])
  const summaries = events.flatMap((event) =>
    event.type === 'test:summary' && event.data.file === undefined ? [event.data] : [])
  const interrupted = events.flatMap((event) =>
    event.type === 'test:interrupted' ? [event.data] : [])
  const watchTransitions = events.flatMap((event) => {
    if (event.type === 'test:watch:drained') {
      return ['drained' as const]
    }

    if (event.type === 'test:watch:restarted') {
      return ['restarted' as const]
    }

    return []
  })

  return {
    completed: producerMessages.some((message) => message.type === 'completed'),
    failure: producerMessages.findLast(
      (message): message is TestProducerMessage & { type: 'failed' } => message.type === 'failed'
    ),
    state: {
      events,
      failures: events.flatMap((event) => (event.type === 'test:fail' ? [event.data] : [])),
      interrupted,
      passes: events.flatMap((event) => (event.type === 'test:pass' ? [event.data] : [])),
      summary: summaries.at(-1),
      watch: {
        drained: watchTransitions.filter((transition) => transition === 'drained').length,
        lastTransition: watchTransitions.at(-1),
        restarted: watchTransitions.filter((transition) => transition === 'restarted').length,
      },
    },
  }
}

const getExecution = (result: ManagedNodeExecuteResult) =>
  result.reason === 'cleanup-failed' ? result.execution : result

export const createProjectTestResult = (
  managedResult: ManagedNodeExecuteResult
): ProjectTestResult => {
  const execution = getExecution(managedResult)
  const protocol = reduceMessages(execution.messages ?? [])
  const base = {
    output: { stderr: execution.stderr, stdout: execution.stdout },
    state: protocol.state,
  }

  if (managedResult.reason === 'cleanup-failed') {
    return {
      ...base,
      reason: 'cleanup-failed',
      executionReason: managedResult.execution.reason,
    }
  }

  if (execution.reason === 'cancelled') {
    return { ...base, reason: 'cancelled' }
  }

  if (execution.reason === 'timed-out') {
    return { ...base, reason: 'timed-out' }
  }

  if (protocol.state.interrupted.length > 0) {
    return { ...base, reason: 'interrupted' }
  }

  if (protocol.failure) {
    return createProjectTestProviderFailure({
      ...base,
      cause: protocol.failure.error.message,
      providerReason: 'producer-failed',
      stage: 'producer',
    })
  }

  if (execution.reason === 'output-failed') {
    return { ...base, reason: 'output-failed', exitCode: execution.exitCode }
  }

  if (execution.reason !== 'completed') {
    return createProjectTestProviderFailure({
      ...base,
      cause: `Managed test execution ended with ${execution.reason}`,
      providerReason: execution.reason,
      stage: 'managed-execution',
    })
  }

  if (execution.exitCode !== 0 || !protocol.completed || !protocol.state.summary) {
    return createProjectTestProviderFailure({
      ...base,
      cause: 'Managed test producer did not return a complete result',
      providerReason: 'producer-incomplete',
      stage: 'producer',
    })
  }

  return {
    ...base,
    reason: protocol.state.summary.success ? 'passed' : 'failed',
  }
}
