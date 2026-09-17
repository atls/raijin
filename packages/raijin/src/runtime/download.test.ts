import assert                               from 'node:assert/strict'
import { test }                             from 'node:test'

import { createRaijinReleaseTagName }       from './download.js'
import { downloadRaijinRuntime }            from './download.js'
import { fetchPublishedRaijinPackage }      from './download.js'
import { fetchRaijinReleasePackageManager } from './download.js'
import { fetchRaijinReleaseRuntimeAsset }   from './download.js'
import { fetchRaijinReleaseSourceRevision } from './download.js'
import { createSha256Digest }               from './release.js'

const version = '1.2.3'
const tagName = '@atls/raijin@1.2.3'
const sourceRevision = 'a'.repeat(40)
const runtime = Buffer.from('runtime')
const assetUrl = 'https://github.com/atls/raijin/releases/download/%40atls%2Fraijin%401.2.3/yarn.js'
const sha256 = createSha256Digest(runtime)

const packageMetadata = {
  name: '@atls/raijin',
  'dist-tags': { latest: version },
  versions: {
    [version]: {
      name: '@atls/raijin',
      version,
      gitHead: sourceRevision,
      dist: { integrity: 'sha512-YWJjZA==' },
    },
  },
}
const githubRelease = {
  tag_name: tagName,
  draft: false,
  prerelease: false,
  assets: [
    {
      name: 'yarn.js',
      state: 'uploaded',
      digest: `sha256:${sha256}`,
      browser_download_url: assetUrl,
    },
  ],
}

const createFetch = (
  values: {
    npm?: unknown
    release?: unknown
    commit?: unknown
    source?: unknown
  } = {}
) =>
  (async (input: Request | URL | string) => {
    const url = input instanceof Request ? input.url : String(input)

    if (url.startsWith('https://registry.npmjs.org/')) {
      return Response.json(values.npm ?? packageMetadata)
    }

    if (url.includes('/releases/tags/')) {
      return Response.json(values.release ?? githubRelease)
    }

    if (url.includes('/commits/')) {
      return Response.json(values.commit ?? { sha: sourceRevision })
    }

    if (url.includes('/contents/package.json')) {
      return Response.json(values.source ?? { packageManager: 'yarn@4.14.1' })
    }

    return new Response(new Uint8Array(runtime))
  }) as typeof fetch

test('reads npm latest and exact GitHub release data without a generated manifest', async () => {
  const fetchImpl = createFetch()

  assert.deepEqual(await fetchPublishedRaijinPackage(fetchImpl), {
    name: '@atls/raijin',
    version,
    gitHead: sourceRevision,
    dist: { integrity: 'sha512-YWJjZA==' },
  })
  assert.equal(createRaijinReleaseTagName(version), tagName)
  assert.deepEqual(await fetchRaijinReleaseRuntimeAsset(fetchImpl, tagName), {
    url: assetUrl,
    sha256,
  })
  assert.equal(await fetchRaijinReleaseSourceRevision(fetchImpl, tagName), sourceRevision)
  assert.equal(await fetchRaijinReleasePackageManager(fetchImpl, sourceRevision), 'yarn@4.14.1')
  assert.deepEqual(await downloadRaijinRuntime(fetchImpl, assetUrl), runtime)
})

test('rejects missing or inconsistent npm latest metadata', async () => {
  await Promise.all(
    [
      { ...packageMetadata, 'dist-tags': {} },
      { ...packageMetadata, versions: {} },
      { ...packageMetadata, name: '@atls/other' },
      {
        ...packageMetadata,
        versions: { [version]: { ...packageMetadata.versions[version], gitHead: null } },
      },
    ].map(async (npm) => assert.rejects(fetchPublishedRaijinPackage(createFetch({ npm }))))
  )
})

test('rejects an absent or incomplete matching GitHub release', async () => {
  const missingRelease = (async (input: Request | URL | string) => {
    const url = input instanceof Request ? input.url : String(input)
    return url.includes('/releases/tags/')
      ? new Response(null, { status: 404 })
      : Response.json(githubRelease)
  }) as typeof fetch

  await assert.rejects(fetchRaijinReleaseRuntimeAsset(missingRelease, tagName), /HTTP 404/)

  await Promise.all(
    [
      { ...githubRelease, draft: true },
      { ...githubRelease, tag_name: '@atls/raijin@1.2.4' },
      { ...githubRelease, assets: [] },
      { ...githubRelease, assets: [{ ...githubRelease.assets[0], digest: null }] },
      { ...githubRelease, assets: [{ ...githubRelease.assets[0], state: 'new' }] },
      {
        ...githubRelease,
        assets: [
          { ...githubRelease.assets[0], browser_download_url: 'https://example.com/yarn.js' },
        ],
      },
    ].map(async (release) =>
      assert.rejects(fetchRaijinReleaseRuntimeAsset(createFetch({ release }), tagName)))
  )
})

test('rejects invalid tag revision or missing exact-source Yarn version', async () => {
  await assert.rejects(
    fetchRaijinReleaseSourceRevision(createFetch({ commit: { sha: 'unknown' } }), tagName),
    /source revision/
  )
  await assert.rejects(
    fetchRaijinReleasePackageManager(
      createFetch({ source: { packageManager: 'pnpm@10.0.0' } }),
      sourceRevision
    ),
    /packageManager/
  )
})
