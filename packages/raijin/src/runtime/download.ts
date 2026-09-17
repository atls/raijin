import type { YarnPackageMetadata }            from '../yarn/runner.js'

import { RaijinRuntimeAssetDownloadException } from './exceptions/asset-download.js'
import { RAIJIN_RUNTIME_ASSET_NAME }           from './release.js'
import { RAIJIN_RUNTIME_PACKAGE_NAME }         from './release.js'

export type FetchLike = typeof fetch

const NPM_PACKAGE_METADATA_URL = 'https://registry.npmjs.org/%40atls%2Fraijin'
const GITHUB_API_URL = 'https://api.github.com/repos/atls/raijin'
const SOURCE_REVISION_PATTERN = /^[a-f0-9]{40}$/
const PACKAGE_INTEGRITY_PATTERN = /^sha512-[A-Za-z0-9+/]+={0,2}$/
const SHA256_DIGEST_PATTERN = /^sha256:([a-f0-9]{64})$/
const YARN_PACKAGE_MANAGER_PATTERN = /^yarn@\d+\.\d+\.\d+$/

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const fetchJson = async (
  fetchImpl: FetchLike,
  url: string,
  accept = 'application/json'
): Promise<unknown> => {
  const response = await fetchImpl(url, {
    headers: {
      accept,
      'user-agent': 'raijin-initializer',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to read Raijin published metadata: HTTP ${response.status}`)
  }

  return response.json()
}

export const fetchPublishedRaijinPackage = async (
  fetchImpl: FetchLike
): Promise<YarnPackageMetadata> => {
  const metadata = await fetchJson(fetchImpl, NPM_PACKAGE_METADATA_URL)

  if (!isRecord(metadata) || metadata.name !== RAIJIN_RUNTIME_PACKAGE_NAME) {
    throw new Error('Published Raijin package metadata is invalid')
  }

  const tags = metadata['dist-tags']
  const { latest } = isRecord(tags) ? tags : { latest: undefined }
  const { versions } = metadata
  const published = typeof latest === 'string' && isRecord(versions) ? versions[latest] : undefined
  const dist = isRecord(published) ? published.dist : undefined

  if (
    typeof latest !== 'string' ||
    !isRecord(published) ||
    published.name !== RAIJIN_RUNTIME_PACKAGE_NAME ||
    published.version !== latest ||
    typeof published.gitHead !== 'string' ||
    !SOURCE_REVISION_PATTERN.test(published.gitHead) ||
    !isRecord(dist) ||
    typeof dist.integrity !== 'string' ||
    !PACKAGE_INTEGRITY_PATTERN.test(dist.integrity)
  ) {
    throw new Error('Published Raijin latest version is unavailable')
  }

  return {
    name: RAIJIN_RUNTIME_PACKAGE_NAME,
    version: latest,
    gitHead: published.gitHead,
    dist: { integrity: dist.integrity },
  }
}

export const createRaijinReleaseTagName = (version: string): string =>
  `${RAIJIN_RUNTIME_PACKAGE_NAME}@${version}`

export const fetchRaijinReleaseSourceRevision = async (
  fetchImpl: FetchLike,
  tagName: string
): Promise<string> => {
  const commit = await fetchJson(
    fetchImpl,
    `${GITHUB_API_URL}/commits/tags/${encodeURIComponent(tagName)}`,
    'application/vnd.github+json'
  )
  const revision = isRecord(commit) ? commit.sha : undefined

  if (typeof revision !== 'string' || !SOURCE_REVISION_PATTERN.test(revision)) {
    throw new Error(`Raijin release ${tagName} has no valid source revision`)
  }

  return revision
}

export const fetchRaijinReleasePackageManager = async (
  fetchImpl: FetchLike,
  sourceRevision: string
): Promise<string> => {
  const source = await fetchJson(
    fetchImpl,
    `${GITHUB_API_URL}/contents/package.json?ref=${encodeURIComponent(sourceRevision)}`,
    'application/vnd.github.raw+json'
  )
  const packageManager = isRecord(source) ? source.packageManager : undefined

  if (typeof packageManager !== 'string' || !YARN_PACKAGE_MANAGER_PATTERN.test(packageManager)) {
    throw new Error(`Raijin source ${sourceRevision} has no supported Yarn packageManager`)
  }

  return packageManager
}

export const fetchRaijinReleaseRuntimeAsset = async (
  fetchImpl: FetchLike,
  tagName: string
): Promise<{ url: string; sha256: string }> => {
  const release = await fetchJson(
    fetchImpl,
    `${GITHUB_API_URL}/releases/tags/${encodeURIComponent(tagName)}`,
    'application/vnd.github+json'
  )

  if (
    !isRecord(release) ||
    release.tag_name !== tagName ||
    release.draft !== false ||
    release.prerelease !== false ||
    !Array.isArray(release.assets)
  ) {
    throw new Error(`Raijin release ${tagName} is unavailable or invalid`)
  }

  const asset: unknown = release.assets.find(
    (entry: unknown) => isRecord(entry) && entry.name === RAIJIN_RUNTIME_ASSET_NAME
  )

  if (!isRecord(asset) || asset.state !== 'uploaded') {
    throw new Error(`Raijin release ${tagName} has no checked ${RAIJIN_RUNTIME_ASSET_NAME} asset`)
  }

  const digest = typeof asset.digest === 'string' ? SHA256_DIGEST_PATTERN.exec(asset.digest) : null
  const url = asset.browser_download_url

  if (!digest || typeof url !== 'string') {
    throw new Error(`Raijin release ${tagName} has no checked runtime digest or URL`)
  }

  let assetUrl: URL
  let assetPath: string

  try {
    assetUrl = new URL(url)
    assetPath = decodeURIComponent(assetUrl.pathname)
  } catch {
    throw new Error(`Raijin release ${tagName} has an invalid runtime asset URL`)
  }

  if (
    assetUrl.origin !== 'https://github.com' ||
    assetPath !== `/atls/raijin/releases/download/${tagName}/${RAIJIN_RUNTIME_ASSET_NAME}`
  ) {
    throw new Error(`Raijin release ${tagName} has an unexpected runtime asset URL`)
  }

  return { url, sha256: digest[1] }
}

export const downloadRaijinRuntime = async (fetchImpl: FetchLike, url: string): Promise<Buffer> => {
  const response = await fetchImpl(url, {
    headers: {
      accept: 'application/octet-stream',
      'user-agent': 'raijin-initializer',
    },
  })

  if (!response.ok) {
    throw new RaijinRuntimeAssetDownloadException(response.status)
  }

  return Buffer.from(await response.arrayBuffer())
}
