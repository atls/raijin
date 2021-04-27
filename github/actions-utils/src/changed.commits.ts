import { context }    from '@actions/github'
import { Endpoints }  from '@octokit/types'

import { getOctokit } from './octokit'

type GetCommitResponseData = Endpoints['GET /repos/{owner}/{repo}/commits/{ref}']['response']

export const getEventCommmits = async () => {
  if (context.eventName === 'push') {
    return context.payload.commits
  }

  if (context.eventName === 'pull_request' && context.payload.pull_request) {
    const url = context.payload.pull_request.commits_url

    return getOctokit().paginate(`GET ${url}`, context.repo)
  }

  // eslint-disable-next-line no-console
  console.log(`Unknown event "${context.eventName}". Only "push" and "pull_request" supported.`)

  return []
}

export const getCommitData = async (ref: string): Promise<GetCommitResponseData> => {
  const commit = await getOctokit().repos.getCommit({
    ...context.repo,
    ref,
  })

  return commit as GetCommitResponseData
}

export const getChangedCommmits = async (): Promise<Array<GetCommitResponseData>> => {
  const eventCommits = await getEventCommmits()

  return Promise.all(eventCommits.map((commit) => getCommitData(commit.id || commit.sha)))
}
