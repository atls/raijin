import type { EventData } from 'node:test'
import type { TestEvent } from 'node:test/reporters'

export interface InterruptedTest {
  column?: number
  file?: string
  line?: number
  name: string
  nesting: number
}

export interface InterruptedEvent {
  data: {
    tests: Array<InterruptedTest>
  }
  type: 'test:interrupted'
}

export type ProjectTestEvent = InterruptedEvent | TestEvent
export type ProjectTestFailure = EventData.TestFail
export type ProjectTestPass = EventData.TestPass
export type ProjectTestSummary = EventData.TestSummary
