import assert                                                 from 'node:assert/strict'
import { mkdtemp }                                            from 'node:fs/promises'
import { tmpdir }                                             from 'node:os'
import { join }                                               from 'node:path'
import { test }                                               from 'node:test'

import { RaijinInitializerUsageException }                    from './exceptions/usage.exception.js'
import { runRaijinInitializer as runPublicRaijinInitializer } from '../index.js'
import { createSha256Digest }                                 from '../runtime/manifest.js'
import { runRaijinInitializer }                               from './index.js'

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

const EXPECTED_INITIALIZER_COMMANDS = [
  ['add', '-D', '@atls/code-runtime@latest'],
  ['generate', 'project'],
  ['tools', 'sync'],
]

const collectInitializerCommands = async (
  runInitializer: typeof runRaijinInitializer
): Promise<Array<Array<string>>> => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-initializer-'))
  const commands: Array<Array<string>> = []

  await runInitializer({
    argv: ['init'],
    cwd,
    fetchImpl: createFetch(Buffer.from('runtime')),
    runYarnCommand: async (args) => {
      commands.push(args)
    },
  })

  return commands
}

test('should run initializer command sequence', async () => {
  assert.deepEqual(
    await collectInitializerCommands(runRaijinInitializer),
    EXPECTED_INITIALIZER_COMMANDS
  )
})

test('should expose initializer command through public index', async () => {
  assert.deepEqual(
    await collectInitializerCommands(runPublicRaijinInitializer),
    EXPECTED_INITIALIZER_COMMANDS
  )
})

test('should reject unknown initializer arguments', async () => {
  await assert.rejects(
    runRaijinInitializer({
      argv: ['unknown'],
      fetchImpl: createFetch(Buffer.from('runtime')),
    }),
    (error) =>
      error instanceof RaijinInitializerUsageException &&
      error.message.includes('Usage: yarn init @atls/raijin')
  )
})
