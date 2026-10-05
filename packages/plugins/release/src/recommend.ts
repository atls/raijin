import type { Workspace }        from '@yarnpkg/core'
import type { Preset }           from 'conventional-recommended-bump'

import { ConventionalGitClient } from '@conventional-changelog/git-client'
import { packagePrefix }         from '@conventional-changelog/git-client'
import { structUtils }           from '@yarnpkg/core'
import { npath }                 from '@yarnpkg/fslib'
import { Bumper }                from 'conventional-recommended-bump'
import createPreset              from 'conventional-changelog-conventionalcommits'
import semver                    from 'semver'

export type VersionRecommendation = 'major' | 'minor' | 'patch'

const createBumpPreset = (): Preset => {
  const candidate: unknown = createPreset()

  if (
    typeof candidate !== 'object' ||
    candidate === null ||
    !('whatBump' in candidate) ||
    typeof candidate.whatBump !== 'function'
  ) {
    throw new Error('Conventional Commits preset has no bump recommendation')
  }

  return candidate as Preset
}

const preset = createBumpPreset()

export const recommendWorkspaceVersion = async (
  root: string,
  workspace: Workspace
): Promise<VersionRecommendation | null> => {
  const { name, version: currentVersion } = workspace.manifest

  if (!name || !currentVersion) {
    return null
  }

  const ident = structUtils.stringifyIdent(name)
  const prefix = packagePrefix(ident)

  if (typeof prefix !== 'string') {
    throw new Error(`Unsupported release tag prefix for ${ident}`)
  }

  const git = new ConventionalGitClient(root)
  const tag = await git.getLastSemverTag({ prefix })

  if (!tag) {
    return null
  }

  const taggedVersion = tag.slice(prefix.length)

  if (!semver.valid(taggedVersion) || !semver.valid(currentVersion)) {
    throw new Error(`Invalid version for ${ident}: ${tag} or ${currentVersion}`)
  }

  if (semver.gt(taggedVersion, currentVersion)) {
    throw new Error(`${ident} has a version older than its latest release tag`)
  }

  if (taggedVersion !== currentVersion) {
    return null
  }

  const result = await new Bumper(root)
    .config(preset)
    .tag(tag)
    .commits({ path: npath.fromPortablePath(workspace.relativeCwd) })
    .bump(preset.whatBump)

  if (result.commits.length === 0) {
    return null
  }

  return 'releaseType' in result ? result.releaseType : 'patch'
}
