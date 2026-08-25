import type { ChangedStateSourceSelection } from './interfaces/source.js'
import type { GitHubActionsEventInput }   from './interfaces/source.js'

const EMPTY_GIT_OBJECT = /^0+$/

export const selectChangedStateSource = (
  since?: string,
  event?: GitHubActionsEventInput
): ChangedStateSourceSelection => {
  if (since !== undefined) {
    if (since.trim().length === 0) {
      return { kind: 'error', reason: 'invalid-comparison', source: 'git-range' }
    }

    return {
      kind: 'selected',
      source: {
        kind: 'git-range',
        base: since,
        head: 'HEAD',
      },
    }
  }

  if (!event) {
    return { kind: 'selected', source: { kind: 'working-tree' } }
  }

  if (event.name === 'pull_request') {
    if (!event.pullRequest || !event.repository) {
      return { kind: 'error', reason: 'incomplete-event', eventName: 'pull_request' }
    }

    return {
      kind: 'selected',
      source: {
        kind: 'pull-request',
        base: event.pullRequest.base,
        head: event.pullRequest.head,
        number: event.pullRequest.number,
        owner: event.repository.owner,
        repo: event.repository.repo,
      },
    }
  }

  if (event.name === 'push') {
    if (!event.push) {
      return { kind: 'error', reason: 'incomplete-event', eventName: 'push' }
    }

    if (EMPTY_GIT_OBJECT.test(event.push.before) || EMPTY_GIT_OBJECT.test(event.push.after)) {
      return { kind: 'error', reason: 'invalid-comparison', source: 'push' }
    }

    return {
      kind: 'selected',
      source: {
        kind: 'push',
        base: event.push.before,
        head: event.push.after,
      },
    }
  }

  return { kind: 'error', reason: 'unsupported-event', eventName: event.name }
}
