import type { EventData } from 'node:test'

export type TestProjectTerminal =
  | { readonly exitCode: 0; readonly reason: 'passed' }
  | { readonly exitCode: 1; readonly reason: 'failed' }
  | { readonly exitCode: 1; readonly reason: 'provider-failed' }

type TestProjectCompletedFields = {
  readonly status: 'completed'
  readonly failures: ReadonlyArray<EventData.TestFail>
  readonly stderr: ReadonlyArray<EventData.TestStderr>
  readonly summary: EventData.TestSummary
}

export type TestProjectCompletedResult = TestProjectCompletedFields &
  (
    | { readonly terminal: Extract<TestProjectTerminal, { reason: 'failed' }> }
    | { readonly terminal: Extract<TestProjectTerminal, { reason: 'passed' }> }
  )

export type TestProjectProviderFailedResult = {
  readonly status: 'provider-failed'
  readonly failure: {
    readonly name: string
    readonly message: string
  }
  readonly terminal: Extract<TestProjectTerminal, { reason: 'provider-failed' }>
}

export type TestProjectResult = TestProjectCompletedResult | TestProjectProviderFailedResult
