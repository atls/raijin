import type { TestProjectProviderFailedResult } from './interfaces/result.js'

export const toProviderFailure = (error: unknown): TestProjectProviderFailedResult['failure'] => ({
  name: error instanceof Error ? error.name : 'Error',
  message: error instanceof Error ? error.message : String(error),
})
