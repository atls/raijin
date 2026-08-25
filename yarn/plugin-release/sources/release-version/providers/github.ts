import type { ReleaseVersionChange } from '../../release-version-policy.utils.js'

import { context }                   from '@actions/github'
import { getOctokit }                from '@actions/github'

const COMMIT_FILES_PAGE_SIZE = 100

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const readString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined

const readCommitRef = (payload: unknown): string => {
  const ref = isRecord(payload) ? readString(payload.id) ?? readString(payload.sha) : undefined

  if (!ref) {
    throw new Error('GitHub commit reference payload is invalid', { cause: payload })
  }

  return ref
}

export const normalizeGitHubCommitPages = (
  pages: ReadonlyArray<unknown>
): ReleaseVersionChange => {
  let message: string | undefined
  const files = new Set<string>()

  for (const payload of pages) {
    if (!isRecord(payload)) {
      throw new Error('GitHub commit payload is invalid', { cause: payload })
    }

    const commit = isRecord(payload.commit) ? payload.commit : undefined
    const pageMessage = commit ? readString(commit.message) : undefined

    if (!pageMessage) {
      throw new Error('GitHub commit message payload is invalid', { cause: payload })
    }

    message ??= pageMessage

    if (payload.files === undefined) {
      continue
    }

    if (!Array.isArray(payload.files)) {
      throw new Error('GitHub commit files payload is invalid', { cause: payload })
    }

    for (const file of payload.files) {
      const filename = isRecord(file) ? readString(file.filename) : undefined
      const previousFilename = isRecord(file) ? readString(file.previous_filename) : undefined

      if (!filename) {
        throw new Error('GitHub commit file payload is invalid', { cause: file })
      }

      files.add(filename)

      if (previousFilename) {
        files.add(previousFilename)
      }
    }
  }

  if (!message) {
    throw new Error('GitHub commit pagination returned no commit', { cause: pages })
  }

  return { message, files: [...files] }
}

const readEventCommitRefs = async (
  octokit: ReturnType<typeof getOctokit>
): Promise<ReadonlyArray<string>> => {
  if (context.eventName === 'push') {
    if (!Array.isArray(context.payload.commits)) {
      throw new Error('GitHub push commits payload is invalid', { cause: context.payload })
    }

    return context.payload.commits.map(readCommitRef)
  }

  if (context.eventName === 'pull_request' && isRecord(context.payload.pull_request)) {
    const commitsUrl = readString(context.payload.pull_request.commits_url)

    if (!commitsUrl) {
      throw new Error('GitHub pull request commits payload is invalid', {
        cause: context.payload.pull_request,
      })
    }

    const commits: unknown = await octokit.paginate(`GET ${commitsUrl}`, context.repo)

    if (!Array.isArray(commits)) {
      throw new Error('GitHub pull request commits response is invalid', { cause: commits })
    }

    return commits.map(readCommitRef)
  }

  // eslint-disable-next-line no-console
  console.log(`Unknown event "${context.eventName}". Only "push" and "pull_request" supported.`)

  return []
}

const readCommitChange = async (
  octokit: ReturnType<typeof getOctokit>,
  ref: string
): Promise<ReleaseVersionChange> => {
  const pages: Array<unknown> = []

  for await (const response of octokit.paginate.iterator(octokit.rest.repos.getCommit, {
    ...context.repo,
    ref,
    per_page: COMMIT_FILES_PAGE_SIZE,
  })) {
    pages.push(response.data)
  }

  return normalizeGitHubCommitPages(pages)
}

export const readGitHubReleaseVersionChanges = async (): Promise<
  ReadonlyArray<ReleaseVersionChange>
> => {
  const token = process.env.GITHUB_TOKEN

  if (!token) {
    throw new Error('GitHub release version changes require GITHUB_TOKEN')
  }

  const octokit = getOctokit(token)
  const refs = await readEventCommitRefs(octokit)

  return Promise.all(refs.map(async (ref) => readCommitChange(octokit, ref)))
}
