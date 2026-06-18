import type { PortablePath }                    from '@yarnpkg/fslib'

import assert                                   from 'node:assert/strict'
import { Buffer }                               from 'node:buffer'
import { test }                                 from 'node:test'

import { assertYarnRuntimeReleaseAssetMatches } from '../release-create.command.js'
import { createGitHubReleaseNotesOptions }      from '../release-create.command.js'
import { createGitHubReleaseOptions }           from '../release-create.command.js'
import { createYarnRuntimeReleaseAssetOptions } from '../release-create.command.js'
import { isReleaseAlreadyExistsError }          from '../release-create.command.js'
import { parseGitHubReleaseTagVersion }         from '../release-create.command.js'
import { selectPreviousGitHubReleaseTagName }   from '../release-create.command.js'

test('should create releases with GitHub generated release notes', () => {
  assert.deepEqual(
    createGitHubReleaseOptions('@atls/yarn-cli', '1.2.3', 'Release body', 'atls', 'raijin', 'main'),
    {
      body: 'Release body',
      draft: false,
      make_latest: true,
      name: '@atls/yarn-cli@1.2.3',
      owner: 'atls',
      repo: 'raijin',
      tag_name: '@atls/yarn-cli@1.2.3',
      target_commitish: 'main',
    }
  )
})

test('should create release note options with package-specific previous tags', () => {
  assert.deepEqual(
    createGitHubReleaseNotesOptions(
      '@atls/yarn-cli',
      '1.2.3',
      'atls',
      'raijin',
      'main',
      '@atls/yarn-cli@1.2.2'
    ),
    {
      owner: 'atls',
      previous_tag_name: '@atls/yarn-cli@1.2.2',
      repo: 'raijin',
      tag_name: '@atls/yarn-cli@1.2.3',
      target_commitish: 'main',
    }
  )
})

test('should create yarn runtime release asset options only for yarn cli release', () => {
  const projectCwd = '/repo' as PortablePath

  assert.deepEqual(createYarnRuntimeReleaseAssetOptions('@atls/code-github', projectCwd), undefined)
  assert.deepEqual(createYarnRuntimeReleaseAssetOptions('@atls/yarn-cli', projectCwd), {
    content_type: 'text/javascript',
    name: 'yarn.mjs',
    path: '/repo/yarn/cli/dist/runtime/yarn.mjs',
  })
})

test('should accept existing yarn runtime release assets with matching content', async () => {
  const originalFetch = globalThis.fetch

  globalThis.fetch = (async () => new Response('runtime')) as typeof fetch

  try {
    await assertYarnRuntimeReleaseAssetMatches(
      {
        browser_download_url: 'https://github.com/atls/raijin/releases/download/yarn/yarn.mjs',
        name: 'yarn.mjs',
      },
      Buffer.from('runtime')
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('should reject existing yarn runtime release assets with mismatching content', async () => {
  const originalFetch = globalThis.fetch

  globalThis.fetch = (async () => new Response('stale-runtime')) as typeof fetch

  try {
    await assert.rejects(
      assertYarnRuntimeReleaseAssetMatches(
        {
          browser_download_url: 'https://github.com/atls/raijin/releases/download/yarn/yarn.mjs',
          name: 'yarn.mjs',
        },
        Buffer.from('runtime')
      ),
      /Existing release asset yarn\.mjs digest mismatch/
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('should omit previous release tag from first package release notes', () => {
  assert.deepEqual(
    createGitHubReleaseNotesOptions('@atls/yarn-cli', '1.2.3', 'atls', 'raijin', 'main'),
    {
      owner: 'atls',
      repo: 'raijin',
      tag_name: '@atls/yarn-cli@1.2.3',
      target_commitish: 'main',
    }
  )
})

test('should parse scoped package release tag versions', () => {
  assert.equal(parseGitHubReleaseTagVersion('@atls/yarn-cli', '@atls/yarn-cli@1.2.3'), '1.2.3')
})

test('should ignore release tags from other packages', () => {
  assert.equal(
    parseGitHubReleaseTagVersion('@atls/yarn-cli', '@atls/yarn-plugin-tools@1.2.3'),
    undefined
  )
})

test('should select previous package-specific release tag', () => {
  assert.equal(
    selectPreviousGitHubReleaseTagName('@atls/yarn-cli', '1.2.3', [
      '@atls/yarn-plugin-tools@1.2.2',
      '@atls/yarn-cli@1.2.1',
      '@atls/yarn-cli@1.2.2',
      '@atls/yarn-cli@1.2.3',
      '@atls/yarn-cli@1.2.4',
    ]),
    '@atls/yarn-cli@1.2.2'
  )
})

test('should skip previous release tag when package has no older release', () => {
  assert.equal(
    selectPreviousGitHubReleaseTagName('@atls/yarn-cli', '1.2.3', [
      '@atls/yarn-plugin-tools@1.2.2',
      '@atls/yarn-cli@1.2.3',
      '@atls/yarn-cli@1.2.4',
    ]),
    undefined
  )
})

test('should select previous package prerelease tag', () => {
  assert.equal(
    selectPreviousGitHubReleaseTagName('@atls/yarn-cli', '1.2.3-1', [
      '@atls/yarn-cli@1.2.2',
      '@atls/yarn-cli@1.2.3-0',
      '@atls/yarn-cli@1.2.3-1',
      '@atls/yarn-cli@1.2.3',
    ]),
    '@atls/yarn-cli@1.2.3-0'
  )
})

test('should treat stable releases as newer than prereleases', () => {
  assert.equal(
    selectPreviousGitHubReleaseTagName('@atls/yarn-cli', '1.2.3', [
      '@atls/yarn-cli@1.2.2',
      '@atls/yarn-cli@1.2.3-0',
      '@atls/yarn-cli@1.2.3-1',
    ]),
    '@atls/yarn-cli@1.2.3-1'
  )
})

test('should detect existing release tag errors', () => {
  assert.equal(
    isReleaseAlreadyExistsError({
      status: 422,
      message:
        'Validation Failed: {"resource":"Release","code":"already_exists","field":"tag_name"}',
    }),
    true
  )
})

test('should ignore other GitHub validation errors', () => {
  assert.equal(
    isReleaseAlreadyExistsError({
      status: 422,
      message: 'Validation Failed: {"resource":"Release","code":"already_exists","field":"name"}',
    }),
    false
  )
})

test('should ignore non-validation errors', () => {
  assert.equal(
    isReleaseAlreadyExistsError({
      status: 500,
      message:
        'Validation Failed: {"resource":"Release","code":"already_exists","field":"tag_name"}',
    }),
    false
  )
})
