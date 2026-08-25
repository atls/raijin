import type { PullRequestFilesProvider } from './interfaces/provider.js'
import type { PullRequestMetadata }      from './interfaces/provider.js'
import type { PullRequestProviderResult } from './interfaces/provider.js'
import type { ChangedProjectFile }       from './interfaces/result.js'
import type { ChangedFileStatus }        from './interfaces/result.js'
import type { PullRequestChangedFilesResult } from './interfaces/result.js'
import type { PullRequestChangedStateSource } from './interfaces/source.js'

import { getOctokit }                    from '@actions/github'

import { PullRequestPayloadException }   from './exceptions/pull-request-payload.js'
import { PullRequestProviderException }  from './exceptions/pull-request-provider.js'
import { normalizeProjectPath }          from './path.js'

const GITHUB_STATUS: Readonly<Partial<Record<string, ChangedFileStatus>>> = {
  added: 'added',
  changed: 'type-changed',
  copied: 'copied',
  modified: 'modified',
  removed: 'deleted',
  renamed: 'renamed',
}

const GITHUB_PULL_REQUEST_FILES_LIMIT = 3000

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const readString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined

const readNonNegativeInteger = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : undefined

export const createPullRequestFilesProvider = (
  source: PullRequestChangedStateSource,
  environment: Readonly<Record<string, string | undefined>> = process.env
): PullRequestProviderResult => {
  const token = environment.GITHUB_TOKEN

  if (!token) {
    return { kind: 'error', reason: 'missing-token' }
  }

  let octokit: ReturnType<typeof getOctokit>

  try {
    octokit = getOctokit(token)
  } catch (cause) {
    throw new PullRequestProviderException('initialize', source, cause)
  }

  return {
    kind: 'completed',
    provider: {
      async readMetadata(selectedSource) {
        const response = await octokit.rest.pulls.get({
          owner: selectedSource.owner,
          repo: selectedSource.repo,
          pull_number: selectedSource.number,
        })

        return {
          base: response.data.base.sha,
          changedFiles: response.data.changed_files,
          head: response.data.head.sha,
        }
      },
      async listFiles(selectedSource) {
        return octokit.paginate(octokit.rest.pulls.listFiles, {
          owner: selectedSource.owner,
          repo: selectedSource.repo,
          pull_number: selectedSource.number,
          per_page: 100,
        })
      },
    },
  }
}

const readPullRequestMetadata = async (
  source: PullRequestChangedStateSource,
  provider: PullRequestFilesProvider
): Promise<PullRequestMetadata> => {
  let payload: unknown

  try {
    payload = await provider.readMetadata(source)
  } catch (cause) {
    if (cause instanceof PullRequestPayloadException) {
      throw cause
    }

    throw new PullRequestProviderException('read-metadata', source, cause)
  }

  const base = isRecord(payload) ? readString(payload.base) : undefined
  const changedFiles = isRecord(payload)
    ? readNonNegativeInteger(payload.changedFiles)
    : undefined
  const head = isRecord(payload) ? readString(payload.head) : undefined

  if (!base || changedFiles === undefined || !head) {
    throw new PullRequestPayloadException('metadata', source, payload)
  }

  return { base, changedFiles, head }
}

const readPullRequestFiles = async (
  source: PullRequestChangedStateSource,
  provider: PullRequestFilesProvider
): Promise<ReadonlyArray<unknown>> => {
  let payload: unknown

  try {
    payload = await provider.listFiles(source)
  } catch (cause) {
    if (cause instanceof PullRequestPayloadException) {
      throw cause
    }

    throw new PullRequestProviderException('list-files', source, cause)
  }

  if (!Array.isArray(payload)) {
    throw new PullRequestPayloadException('files', source, payload)
  }

  const files: ReadonlyArray<unknown> = payload

  return files
}

const normalizePullRequestFile = (
  source: PullRequestChangedStateSource,
  payload: unknown
): ChangedProjectFile => {
  const filename = isRecord(payload) ? readString(payload.filename) : undefined
  const previousFilename = isRecord(payload) ? readString(payload.previous_filename) : undefined
  const providerStatus = isRecord(payload) ? readString(payload.status) : undefined
  const status = providerStatus ? GITHUB_STATUS[providerStatus] : undefined

  if (!filename || !status) {
    throw new PullRequestPayloadException('files', source, payload)
  }

  try {
    if (status === 'copied' || status === 'renamed') {
      if (!previousFilename) {
        throw new PullRequestPayloadException('files', source, payload)
      }

      return {
        path: normalizeProjectPath(filename),
        previousPath: normalizeProjectPath(previousFilename),
        status,
      }
    }

    return {
      path: normalizeProjectPath(filename),
      status,
    }
  } catch (cause) {
    if (cause instanceof PullRequestPayloadException) {
      throw cause
    }

    throw new PullRequestPayloadException('files', source, payload, cause)
  }
}

const isSelectedSnapshot = (
  source: PullRequestChangedStateSource,
  metadata: PullRequestMetadata
): boolean => metadata.base === source.base && metadata.head === source.head

export const resolvePullRequestChangedFiles = async (
  source: PullRequestChangedStateSource,
  provider: PullRequestFilesProvider
): Promise<PullRequestChangedFilesResult> => {
  const initialMetadata = await readPullRequestMetadata(source, provider)

  if (!isSelectedSnapshot(source, initialMetadata)) {
    return { kind: 'error', reason: 'stale-pull-request' }
  }

  const payloads = await readPullRequestFiles(source, provider)
  const finalMetadata = await readPullRequestMetadata(source, provider)

  if (!isSelectedSnapshot(source, finalMetadata)) {
    return { kind: 'error', reason: 'stale-pull-request' }
  }

  if (
    initialMetadata.changedFiles !== finalMetadata.changedFiles ||
    finalMetadata.changedFiles > GITHUB_PULL_REQUEST_FILES_LIMIT ||
    payloads.length !== finalMetadata.changedFiles
  ) {
    return {
      kind: 'error',
      reason: 'incomplete-pull-request-files',
      expected: finalMetadata.changedFiles,
      received: payloads.length,
      limit: GITHUB_PULL_REQUEST_FILES_LIMIT,
    }
  }

  const files = payloads.map((payload) => normalizePullRequestFile(source, payload))

  return { kind: 'completed', files }
}
