import type { ProjectTestResult } from './result.js'

export type ProjectTestOutcome = { exitCode: 0 } | { exitCode: 1; summary: string }

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
