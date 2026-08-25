import type { ChangedStateManagedError } from './interfaces/result.js'

export const formatChangedStateManagedError = (error: ChangedStateManagedError): string => {
  switch (error.reason) {
    case 'incomplete-event':
      return `GitHub ${error.eventName} event context is incomplete`
    case 'incomplete-pull-request-files':
      return `GitHub pull request file list is incomplete: expected ${error.expected}, received ${error.received}, provider limit ${error.limit}`
    case 'invalid-comparison':
      return `${error.source} changed state does not define two comparable Git objects`
    case 'missing-token':
      return 'Pull request changed state requires GITHUB_TOKEN'
    case 'stale-pull-request':
      return 'GitHub pull request changed after the selected event snapshot'
    case 'unsupported-event':
      return `GitHub event "${error.eventName}" does not provide changed project state`
    default: {
      const exhaustiveError: never = error

      return exhaustiveError
    }
  }
}
