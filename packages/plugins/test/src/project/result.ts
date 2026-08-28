import type { InterruptedEvent }   from './event.js'
import type { ProjectTestEvent }   from './event.js'
import type { ProjectTestFailure } from './event.js'
import type { ProjectTestPass }    from './event.js'
import type { ProjectTestSummary } from './event.js'

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

interface ProjectTestProviderFailureInput {
  cause: unknown
  output?: ResultBase['output']
  providerReason: string
  stage: ProjectTestProviderStage
  state?: ProjectTestState
}

export const createProjectTestState = (): ProjectTestState => ({
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
