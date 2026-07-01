import type { PortablePath }      from '@yarnpkg/fslib'

import assert                     from 'node:assert/strict'
import { Buffer }                 from 'node:buffer'
import { execSync }               from 'node:child_process'
import { createHash }             from 'node:crypto'
import { mkdir }                  from 'node:fs/promises'
import { readFile }               from 'node:fs/promises'
import { writeFile }              from 'node:fs/promises'
import { dirname }                from 'node:path'

import { BaseCommand }            from '@yarnpkg/cli'
import { WorkspaceRequiredError } from '@yarnpkg/cli'
import { Configuration }          from '@yarnpkg/core'
import { Project }                from '@yarnpkg/core'
import { StreamReport }           from '@yarnpkg/core'
import { execUtils }              from '@yarnpkg/core'
import { npath }                  from '@yarnpkg/fslib'
import { ppath }                  from '@yarnpkg/fslib'
import { xfs }                    from '@yarnpkg/fslib'

import { Release }                from '@atls/code-github'

import { parseGitHubUrl }         from './utils/parse-git-url.js'

const RELEASE_ALREADY_EXISTS_STATUS = 422
const RELEASE_ALREADY_EXISTS_RESOURCE = '"resource":"Release"'
const RELEASE_ALREADY_EXISTS_CODE = '"code":"already_exists"'
const RELEASE_ALREADY_EXISTS_FIELD = '"field":"tag_name"'
const RAIJIN_PUBLIC_PACKAGE_NAME = '@atls/raijin'
const YARN_RUNTIME_ASSET_NAME = 'yarn.mjs'
const YARN_RUNTIME_ASSET_CONTENT_TYPE = 'text/javascript'
const YARN_RUNTIME_MANIFEST_PATH = '.yarn/releases/raijin-runtime.json'
const YARN_RUNTIME_MANIFEST_SCHEMA_VERSION = 1
const PACKAGE_JSON = 'package.json'

interface GitHubReleaseError {
  status?: number
  message?: string
}

interface GitHubReleaseOptions {
  body: string
  draft: boolean
  make_latest: boolean
  name: string
  owner: string
  repo: string
  tag_name: string
  target_commitish: string
}

interface GitHubReleaseNotesOptions {
  owner: string
  previous_tag_name?: string
  repo: string
  tag_name: string
  target_commitish: string
}

interface GitHubRelease {
  id: number
  assets: Array<{
    browser_download_url: string
    name: string
  }>
}

interface GitHubReleaseAssetOptions {
  content_type: string
  name: string
  path: string
}

interface GitHubReleaseAsset {
  browser_download_url: string
  name: string
}

interface PackageManifest {
  packageManager?: unknown
}

interface YarnRuntimeManifest {
  assetName: string
  assetUrl: string
  packageName: string
  packageManager: string
  schemaVersion: number
  sha256: string
  tagName: string
  version: string
}

interface SemVer {
  major: number
  minor: number
  patch: number
  prerelease: Array<string>
}

export const isReleaseAlreadyExistsError = (error: unknown): boolean => {
  const githubError = error as GitHubReleaseError

  return (
    githubError.status === RELEASE_ALREADY_EXISTS_STATUS &&
    typeof githubError.message === 'string' &&
    githubError.message.includes(RELEASE_ALREADY_EXISTS_RESOURCE) &&
    githubError.message.includes(RELEASE_ALREADY_EXISTS_CODE) &&
    githubError.message.includes(RELEASE_ALREADY_EXISTS_FIELD)
  )
}

export const createGitHubReleaseTagName = (packageName: string, version: string): string =>
  `${packageName}@${version}`

export const createGitHubReleaseOptions = (
  packageName: string,
  version: string,
  body: string,
  owner: string,
  repo: string,
  targetCommitish: string
): GitHubReleaseOptions => {
  const tagName = createGitHubReleaseTagName(packageName, version)

  return {
    body,
    draft: false,
    make_latest: true,
    name: tagName,
    owner,
    repo,
    tag_name: tagName,
    target_commitish: targetCommitish,
  }
}

export const createGitHubReleaseNotesOptions = (
  packageName: string,
  version: string,
  owner: string,
  repo: string,
  targetCommitish: string,
  previousTagName?: string
): GitHubReleaseNotesOptions => {
  const options: GitHubReleaseNotesOptions = {
    owner,
    repo,
    tag_name: createGitHubReleaseTagName(packageName, version),
    target_commitish: targetCommitish,
  }

  if (previousTagName) {
    options.previous_tag_name = previousTagName
  }

  return options
}

export const createYarnRuntimeReleaseAssetOptions = (
  packageName: string,
  projectCwd: PortablePath
): GitHubReleaseAssetOptions | undefined => {
  if (packageName !== RAIJIN_PUBLIC_PACKAGE_NAME) {
    return undefined
  }

  return {
    content_type: YARN_RUNTIME_ASSET_CONTENT_TYPE,
    name: YARN_RUNTIME_ASSET_NAME,
    path: npath.fromPortablePath(
      ppath.join(projectCwd, 'yarn/cli/dist/runtime/yarn.mjs' as PortablePath)
    ),
  }
}

export const createYarnRuntimeReleaseAssetDigest = (data: Buffer): string =>
  createHash('sha256').update(data).digest('hex')

export const createYarnRuntimeManifestPath = (projectCwd: PortablePath): string =>
  npath.fromPortablePath(ppath.join(projectCwd, YARN_RUNTIME_MANIFEST_PATH as PortablePath))

export const readYarnRuntimePackageManager = async (projectCwd: PortablePath): Promise<string> => {
  const manifestPath = npath.fromPortablePath(ppath.join(projectCwd, PACKAGE_JSON as PortablePath))
  const manifest = JSON.parse(await readFile(manifestPath, 'utf-8')) as PackageManifest

  if (typeof manifest.packageManager !== 'string' || manifest.packageManager.length === 0) {
    throw new Error('Missing root packageManager')
  }

  return manifest.packageManager
}

export const createYarnRuntimeManifest = (
  packageName: string,
  version: string,
  asset: GitHubReleaseAsset,
  data: Buffer,
  packageManager: string
): YarnRuntimeManifest => ({
  assetName: asset.name,
  assetUrl: asset.browser_download_url,
  packageName,
  packageManager,
  schemaVersion: YARN_RUNTIME_MANIFEST_SCHEMA_VERSION,
  sha256: createYarnRuntimeReleaseAssetDigest(data),
  tagName: createGitHubReleaseTagName(packageName, version),
  version,
})

export const fetchYarnRuntimeReleaseAssetData = async (
  asset: GitHubReleaseAsset
): Promise<Buffer> => {
  const response = await fetch(asset.browser_download_url, {
    headers: {
      'user-agent': 'raijin-yarn-plugin-release',
    },
  })

  if (!response.ok) {
    throw new Error(
      `Failed to verify existing release asset ${asset.name}: HTTP ${response.status}`
    )
  }

  return Buffer.from(await response.arrayBuffer())
}

export const assertYarnRuntimeReleaseAssetMatches = async (
  asset: GitHubReleaseAsset,
  expectedData: Buffer
): Promise<void> => {
  const actualDigest = createYarnRuntimeReleaseAssetDigest(
    await fetchYarnRuntimeReleaseAssetData(asset)
  )
  const expectedDigest = createYarnRuntimeReleaseAssetDigest(expectedData)

  if (actualDigest !== expectedDigest) {
    throw new Error(
      `Existing release asset ${asset.name} digest mismatch: expected ${expectedDigest}, got ${actualDigest}`
    )
  }
}

const writeYarnRuntimeManifest = async (
  project: Project,
  manifest: YarnRuntimeManifest
): Promise<void> => {
  const manifestPath = createYarnRuntimeManifestPath(project.cwd)

  await mkdir(dirname(manifestPath), { recursive: true })
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
}

const ensureYarnRuntimeReleaseAsset = async (
  release: Release,
  githubRelease: GitHubRelease,
  packageName: string,
  version: string,
  project: Project,
  owner: string,
  repo: string,
  report: StreamReport
): Promise<void> => {
  const assetOptions = createYarnRuntimeReleaseAssetOptions(packageName, project.cwd)

  if (!assetOptions) {
    return
  }

  if (!(await xfs.existsPromise(npath.toPortablePath(assetOptions.path)))) {
    throw new Error(`Missing Raijin runtime asset source: ${assetOptions.path}`)
  }

  const data = await readFile(assetOptions.path)
  const existingAsset = githubRelease.assets.find((asset) => asset.name === assetOptions.name)
  let asset: GitHubReleaseAsset

  if (existingAsset) {
    await assertYarnRuntimeReleaseAssetMatches(existingAsset, data)
    report.reportInfo(null, `Release asset ${assetOptions.name} already exists; verified`)
    asset = existingAsset
  } else {
    asset = await release.uploadAsset({
      owner,
      repo,
      release_id: githubRelease.id,
      data: data.toString('utf-8'),
      size: data.byteLength,
      ...assetOptions,
    })
  }

  await writeYarnRuntimeManifest(
    project,
    createYarnRuntimeManifest(
      packageName,
      version,
      asset,
      data,
      await readYarnRuntimePackageManager(project.cwd)
    )
  )
}

const isNumericSemverIdentifier = (identifier: string): boolean =>
  identifier.length > 0 && [...identifier].every((char) => char >= '0' && char <= '9')

const parseSemver = (version: string): SemVer | undefined => {
  const [withoutBuild] = version.split('+')
  const prereleaseIndex = withoutBuild.indexOf('-')
  const versionCore = prereleaseIndex === -1 ? withoutBuild : withoutBuild.slice(0, prereleaseIndex)
  const prereleaseCore = prereleaseIndex === -1 ? '' : withoutBuild.slice(prereleaseIndex + 1)
  const versionParts = versionCore.split('.')

  if (versionParts.length !== 3) {
    return undefined
  }

  const parsedVersionParts = versionParts.map((part) => Number(part))

  if (!parsedVersionParts.every((part) => Number.isInteger(part) && part >= 0)) {
    return undefined
  }

  const prerelease = prereleaseCore.length > 0 ? prereleaseCore.split('.') : []

  if (prerelease.some((identifier) => identifier.length === 0)) {
    return undefined
  }

  return {
    major: parsedVersionParts[0],
    minor: parsedVersionParts[1],
    patch: parsedVersionParts[2],
    prerelease,
  }
}

const comparePrereleaseIdentifier = (leftIdentifier: string, rightIdentifier: string): number => {
  const leftNumeric = isNumericSemverIdentifier(leftIdentifier)
  const rightNumeric = isNumericSemverIdentifier(rightIdentifier)

  if (leftNumeric && rightNumeric) {
    return Number(leftIdentifier) - Number(rightIdentifier)
  }

  if (leftNumeric !== rightNumeric) {
    return leftNumeric ? -1 : 1
  }

  return leftIdentifier.localeCompare(rightIdentifier)
}

const compareSemver = (leftVersion: string, rightVersion: string): number => {
  const leftSemver = parseSemver(leftVersion)
  const rightSemver = parseSemver(rightVersion)

  if (!leftSemver || !rightSemver) {
    return leftVersion.localeCompare(rightVersion)
  }

  for (const key of ['major', 'minor', 'patch'] as const) {
    const diff = leftSemver[key] - rightSemver[key]

    if (diff !== 0) {
      return diff
    }
  }

  if (leftSemver.prerelease.length === 0 && rightSemver.prerelease.length > 0) {
    return 1
  }

  if (leftSemver.prerelease.length > 0 && rightSemver.prerelease.length === 0) {
    return -1
  }

  const prereleaseLength = Math.min(leftSemver.prerelease.length, rightSemver.prerelease.length)

  for (const index of Array.from({ length: prereleaseLength }, (_, currentIndex) => currentIndex)) {
    const leftIdentifier = leftSemver.prerelease[index]
    const rightIdentifier = rightSemver.prerelease[index]
    const diff = comparePrereleaseIdentifier(leftIdentifier, rightIdentifier)

    if (diff !== 0) {
      return diff
    }
  }

  return leftSemver.prerelease.length - rightSemver.prerelease.length
}

export const parseGitHubReleaseTagVersion = (
  packageName: string,
  tagName: string
): string | undefined => {
  const tagPrefix = `${packageName}@`

  if (!tagName.startsWith(tagPrefix)) {
    return undefined
  }

  return tagName.slice(tagPrefix.length)
}

export const selectPreviousGitHubReleaseTagName = (
  packageName: string,
  version: string,
  tagNames: Array<string>
): string | undefined =>
  tagNames
    .map((tagName) => ({
      tagName,
      version: parseGitHubReleaseTagVersion(packageName, tagName),
    }))
    .filter((tag): tag is { tagName: string; version: string } => typeof tag.version === 'string')
    .filter((tag) => compareSemver(tag.version, version) < 0)
    .sort((leftTag, rightTag) => compareSemver(rightTag.version, leftTag.version))[0]?.tagName

export const getGitHubReleaseTagNames = async (
  project: Project,
  packageName: string
): Promise<Array<string>> => {
  const { stdout } = await execUtils.execvp('git', ['tag', '--list', `${packageName}@*`], {
    cwd: project.cwd,
    strict: true,
  })

  return stdout
    .split('\n')
    .map((tagName) => tagName.trim())
    .filter(Boolean)
}

export const getGitHubReleaseTargetCommitish = async (project: Project): Promise<string> => {
  const { stdout } = await execUtils.execvp('git', ['rev-parse', 'HEAD'], {
    cwd: project.cwd,
    strict: true,
  })

  return stdout.trim()
}

export class ReleaseCreateCommand extends BaseCommand {
  static override paths = [['release', 'create']]

  override async execute(): Promise<number> {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project, workspace } = await Project.find(configuration, this.context.cwd)

    if (!workspace) throw new WorkspaceRequiredError(project.cwd, this.context.cwd)

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async (report) => {
        await report.startTimerPromise('Creating release', async () => {
          const token = process.env.GITHUB_TOKEN

          assert.ok(token, 'GitHub Token is missing')

          let packageName = ''

          const scopeName = workspace.manifest.name?.scope

          if (scopeName) {
            packageName += `@${scopeName}/`
          }

          const workspaceName = workspace.manifest.name?.name
          assert.ok(workspaceName, 'Missing workspace name')
          const { version } = workspace.manifest
          assert.ok(version, 'Missing version')

          packageName += `${workspaceName}`

          const release = new Release({ token })

          let owner: string
          let repo: string
          try {
            ;({ repository: repo, organization: owner } = parseGitHubUrl(
              // eslint-disable-next-line n/no-sync
              execSync('git remote get-url origin', { encoding: 'utf-8' })
            ))
          } catch {
            ;[owner, repo] = process.env.GITHUB_REPOSITORY?.split('/') ?? ['', '']
          }

          assert.ok(owner, 'Could not get url of the repo')
          assert.ok(repo, 'Could not get url of the repo')

          try {
            const tagNames = await getGitHubReleaseTagNames(project, packageName)
            const targetCommitish = await getGitHubReleaseTargetCommitish(project)
            const previousTagName = selectPreviousGitHubReleaseTagName(
              packageName,
              version,
              tagNames
            )
            const releaseNotesOptions = createGitHubReleaseNotesOptions(
              packageName,
              version,
              owner,
              repo,
              targetCommitish,
              previousTagName
            )
            const releaseNotes = await release.generateNotes(releaseNotesOptions)
            const releaseOptions = createGitHubReleaseOptions(
              packageName,
              version,
              releaseNotes,
              owner,
              repo,
              targetCommitish
            )

            const githubRelease = await release.create(releaseOptions)

            await ensureYarnRuntimeReleaseAsset(
              release,
              githubRelease,
              packageName,
              version,
              project,
              owner,
              repo,
              report
            )
          } catch (error) {
            if (isReleaseAlreadyExistsError(error)) {
              const tagName = createGitHubReleaseTagName(packageName, version)
              const githubRelease = await release.getByTag({
                owner,
                repo,
                tag_name: tagName,
              })

              await ensureYarnRuntimeReleaseAsset(
                release,
                githubRelease,
                packageName,
                version,
                project,
                owner,
                repo,
                report
              )
              report.reportInfo(null, `Release ${packageName}@${version} already exists; skipping`)

              return
            }

            throw error
          }
        })
      }
    )

    return commandReport.exitCode()
  }
}
