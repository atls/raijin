import { context }                     from '@actions/github'

import type { GitHubActionsEventInput } from './interfaces/source.js'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const readString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined

const readPullRequest = (payload: unknown): GitHubActionsEventInput['pullRequest'] => {
  if (!isRecord(payload) || !isRecord(payload.pull_request)) {
    return undefined
  }

  const pullRequest = payload.pull_request
  const base = isRecord(pullRequest.base) ? readString(pullRequest.base.sha) : undefined
  const head = isRecord(pullRequest.head) ? readString(pullRequest.head.sha) : undefined
  const { number } = pullRequest

  return base && head && Number.isInteger(number) && Number(number) > 0
    ? { base, head, number: Number(number) }
    : undefined
}

const readPush = (payload: unknown): GitHubActionsEventInput['push'] => {
  if (!isRecord(payload)) {
    return undefined
  }

  const before = readString(payload.before)
  const after = readString(payload.after)

  return before && after ? { before, after } : undefined
}

export const readGitHubActionsEvent = (): GitHubActionsEventInput | undefined => {
  if (!process.env.GITHUB_EVENT_PATH) {
    return undefined
  }

  if (context.eventName === 'pull_request') {
    let repository: GitHubActionsEventInput['repository']

    try {
      repository = context.repo
    } catch {
      repository = undefined
    }

    return {
      name: context.eventName,
      repository,
      pullRequest: readPullRequest(context.payload),
    }
  }

  if (context.eventName === 'push') {
    return {
      name: context.eventName,
      push: readPush(context.payload),
    }
  }

  return { name: context.eventName }
}
