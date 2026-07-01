import assert                   from 'node:assert/strict'
import { mkdir }                from 'node:fs/promises'
import { mkdtemp }              from 'node:fs/promises'
import { readFile }             from 'node:fs/promises'
import { readdir }              from 'node:fs/promises'
import { writeFile }            from 'node:fs/promises'
import { tmpdir }               from 'node:os'
import { join }                 from 'node:path'
import { test }                 from 'node:test'

import { installRaijinRuntime } from './installer.js'
import { createSha256Digest }   from './manifest.js'

const TEST_PACKAGE_MANAGER = 'yarn@4.14.1'

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
    assetUrl: 'https://github.com/atls/raijin/releases/download/%40atls%2Fraijin%401.2.3/yarn.mjs',
    packageName: '@atls/raijin',
    packageManager: TEST_PACKAGE_MANAGER,
    schemaVersion: 1,
    sha256: createSha256Digest(runtime),
    tagName: '@atls/raijin@1.2.3',
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

test('should install verified runtime asset and write bootstrap config', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-initializer-'))
  const runtime = Buffer.from('runtime')

  await installRaijinRuntime({ cwd, fetchImpl: createFetch(runtime) })

  assert.equal(await readFile(join(cwd, '.yarn/releases/yarn.mjs'), 'utf-8'), 'runtime')
  assert.equal(
    await readFile(join(cwd, '.yarnrc.yml'), 'utf-8'),
    'nodeLinker: pnp\nyarnPath: .yarn/releases/yarn.mjs\n'
  )
})

test('should preserve existing release files during fresh runtime install', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-initializer-'))
  const releaseDirectory = join(cwd, '.yarn/releases')
  const runtime = Buffer.from('runtime')

  await mkdir(releaseDirectory, { recursive: true })
  await writeFile(join(releaseDirectory, 'yarn-remote.mjs'), 'old-runtime')
  await writeFile(join(releaseDirectory, 'raijin-yarn-1.2.3.mjs'), 'old-runtime')

  await installRaijinRuntime({ cwd, fetchImpl: createFetch(runtime) })

  assert.equal(await readFile(join(releaseDirectory, 'yarn.mjs'), 'utf-8'), 'runtime')
  assert.equal(await readFile(join(releaseDirectory, 'yarn-remote.mjs'), 'utf-8'), 'old-runtime')
  assert.equal(
    await readFile(join(releaseDirectory, 'raijin-yarn-1.2.3.mjs'), 'utf-8'),
    'old-runtime'
  )
})

test('should replace active runtime without leaving temporary files', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-initializer-'))
  const releaseDirectory = join(cwd, '.yarn/releases')
  const runtime = Buffer.from('runtime')

  await mkdir(releaseDirectory, { recursive: true })
  await writeFile(join(releaseDirectory, 'yarn.mjs'), 'old-runtime')

  await installRaijinRuntime({ cwd, fetchImpl: createFetch(runtime) })

  assert.equal(await readFile(join(releaseDirectory, 'yarn.mjs'), 'utf-8'), 'runtime')
  assert.deepEqual(await readdir(releaseDirectory), ['yarn.mjs'])
})
