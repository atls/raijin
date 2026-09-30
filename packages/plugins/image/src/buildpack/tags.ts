import type { CommandExecutor } from './interfaces/executor.js'
import type { TagPolicy }       from './interfaces/pack.js'

import { context }              from '@actions/github'

import { execOrThrow }          from './pack-cli.js'

const IMAGE_TAG_ALIAS_REGEXP = /^[a-zA-Z0-9_][a-zA-Z0-9_.-]{0,127}$/

export const normalizeAdditionalTags = (tags: Array<string> = []): Array<string> => {
  for (const tag of tags) {
    if (!IMAGE_TAG_ALIAS_REGEXP.test(tag)) {
      throw new Error(`Invalid image tag alias "${tag}".`)
    }
  }

  return tags
}

export const getPackImageTags = (
  image: string,
  primaryTag: string,
  additionalTags: Array<string> = [],
  tagSuffixes: Array<string> = []
): Array<string> => {
  const tags = normalizeAdditionalTags([
    primaryTag,
    'latest',
    ...additionalTags,
    ...normalizeAdditionalTags(tagSuffixes).map((suffix) => `${primaryTag}-${suffix}`),
  ])

  return [...new Set(tags)].map((tag) => `${image}:${tag}`)
}

export const getRevision = async (commandExecutor: CommandExecutor): Promise<string> => {
  const { stdout } = await execOrThrow(commandExecutor, 'git', ['rev-parse', '--verify', 'HEAD'], {
    capture: true,
  })
  const revision = stdout.trim()

  if (!revision) {
    throw new Error('Git did not return a revision for image tagging')
  }

  return revision
}

export const getTag = async (
  tagPolicy: Exclude<TagPolicy, 'explicit'>,
  commandExecutor: CommandExecutor
): Promise<string> => {
  if (!['revision', 'hash-timestamp', 'ctx-hash-timestamp'].includes(tagPolicy)) {
    throw new Error(`Unknown image tag policy "${tagPolicy}"`)
  }

  const revision = await getRevision(commandExecutor)

  if (tagPolicy === 'revision') {
    return revision
  }

  const tag = `${revision.slice(0, 7)}-${Date.now()}`

  if (tagPolicy === 'ctx-hash-timestamp') {
    const number = process.env.GITHUB_ACTIONS === 'true' ? context.issue.number : undefined

    return `${number ?? 'local'}-${tag}`
  }

  return tag
}
