import type { Workspace }        from '@yarnpkg/core'
import type { Preset }           from 'conventional-recommended-bump'

import { ConventionalGitClient } from '@conventional-changelog/git-client'
import { Manifest }              from '@yarnpkg/core'
import { Filename }              from '@yarnpkg/fslib'
import { packagePrefix }         from '@conventional-changelog/git-client'
import { execUtils }             from '@yarnpkg/core'
import { structUtils }           from '@yarnpkg/core'
import { npath }                 from '@yarnpkg/fslib'
import { ppath }                 from '@yarnpkg/fslib'
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

const requireTaggedWorkspacePath = async (
  root: string,
  workspace: Workspace,
  ident: string,
  tag: string
): Promise<void> => {
  const manifestPath = ppath.join(workspace.relativeCwd, Filename.manifest)
  const { code, stdout } = await execUtils.execvp('git', ['show', `${tag}:${manifestPath}`], {
    cwd: npath.toPortablePath(root),
  })

  if (code !== 0) {
    throw new Error(
      `Cannot infer ${ident}: its manifest was not at ${manifestPath} in ${tag}; record an explicit Yarn version decision`
    )
  }

  const taggedManifest = Manifest.fromText(stdout)

  if (!taggedManifest.name || structUtils.stringifyIdent(taggedManifest.name) !== ident) {
    throw new Error(
      `Cannot infer ${ident}: its package path changed since ${tag}; record an explicit Yarn version decision`
    )
  }
}

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

  await requireTaggedWorkspacePath(root, workspace, ident, tag)

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
