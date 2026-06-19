import assert                   from 'node:assert/strict'
import { mkdtemp }              from 'node:fs/promises'
import { readFile }             from 'node:fs/promises'
import { tmpdir }               from 'node:os'
import { join }                 from 'node:path'
import { test }                 from 'node:test'

import { installRaijinRuntime } from './installer.js'
import { createSha256Digest }   from './manifest.js'

const getRequestHref = (url: Request | URL | string): string => {
  if (typeof url === 'string') {
    return url
  }

  if (url instanceof URL) {
    return url.href
  }

  return url.url
}

const createFetch = (runtime: Buffer): typeof fetch => {
  const manifest = {
    assetName: 'yarn.mjs',
    assetUrl:
      'https://github.com/atls/raijin/releases/download/%40atls%2Fyarn-cli%401.2.3/yarn.mjs',
    packageName: '@atls/yarn-cli',
    schemaVersion: 1,
    sha256: createSha256Digest(runtime),
    tagName: '@atls/yarn-cli@1.2.3',
    version: '1.2.3',
  }

  return (async (url: Request | URL | string) => {
    const href = getRequestHref(url)

    if (href.endsWith('raijin-runtime.json')) {
      return Response.json(manifest)
    }

    return new Response(new Uint8Array(runtime))
  }) as typeof fetch
}

test('should install verified runtime asset and write yarnPath', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-initializer-'))
  const runtime = Buffer.from('runtime')

  await installRaijinRuntime({ cwd, fetchImpl: createFetch(runtime) })

  assert.equal(
    await readFile(join(cwd, '.yarn/releases/raijin-yarn-1.2.3.mjs'), 'utf-8'),
    'runtime'
  )
  assert.equal(
    await readFile(join(cwd, '.yarnrc.yml'), 'utf-8'),
    'yarnPath: .yarn/releases/raijin-yarn-1.2.3.mjs\n'
  )
})
