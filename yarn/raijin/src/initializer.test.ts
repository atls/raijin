import assert                                                 from 'node:assert/strict'
import { mkdtemp }                                            from 'node:fs/promises'
import { readFile }                                           from 'node:fs/promises'
import { tmpdir }                                             from 'node:os'
import { join }                                               from 'node:path'
import { test }                                               from 'node:test'

import { updateYarnPathConfiguration }                        from './bootstrap.js'
import { runRaijinInitializer as runPublicRaijinInitializer } from './index.js'
import { runRaijinInitializer }                               from './initializer.js'
import { installRaijinRuntime }                               from './runtime-installer.js'
import { createSha256Digest }                                 from './runtime.js'
import { parseRaijinRuntimeManifest }                         from './runtime.js'
import { createYarnCommandEnvironment }                       from './yarn-command.js'

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

test('should parse Raijin runtime manifest', () => {
  assert.deepEqual(
    parseRaijinRuntimeManifest({
      assetName: 'yarn.mjs',
      assetUrl: 'https://github.com/atls/raijin/releases/download/yarn/yarn.mjs',
      packageName: '@atls/yarn-cli',
      schemaVersion: 1,
      sha256: 'a'.repeat(64),
      tagName: '@atls/yarn-cli@1.2.3',
      version: '1.2.3',
    }),
    {
      assetName: 'yarn.mjs',
      assetUrl: 'https://github.com/atls/raijin/releases/download/yarn/yarn.mjs',
      packageName: '@atls/yarn-cli',
      schemaVersion: 1,
      sha256: 'a'.repeat(64),
      tagName: '@atls/yarn-cli@1.2.3',
      version: '1.2.3',
    }
  )
})

test('should reject non-yarn runtime manifest', () => {
  assert.throws(
    () =>
      parseRaijinRuntimeManifest({
        assetName: 'yarn.mjs',
        assetUrl: 'https://github.com/atls/raijin/releases/download/yarn/yarn.mjs',
        packageName: '@atls/code-runtime',
        schemaVersion: 1,
        sha256: 'a'.repeat(64),
        tagName: '@atls/code-runtime@1.2.3',
        version: '1.2.3',
      }),
    /expected @atls\/yarn-cli/
  )
})

test('should update yarn path in existing yarnrc', () => {
  assert.equal(
    updateYarnPathConfiguration(
      'nodeLinker: pnp\nyarnPath: .yarn/releases/yarn.mjs\n',
      '.yarn/releases/raijin-yarn-1.2.3.mjs'
    ),
    'nodeLinker: pnp\nyarnPath: .yarn/releases/raijin-yarn-1.2.3.mjs\n'
  )
})

test('should append yarn path to yarnrc without one', () => {
  assert.equal(
    updateYarnPathConfiguration('nodeLinker: pnp\n', '.yarn/releases/raijin-yarn-1.2.3.mjs'),
    'nodeLinker: pnp\nyarnPath: .yarn/releases/raijin-yarn-1.2.3.mjs\n'
  )
})

test('should allow nested yarn commands to follow configured yarnPath', () => {
  assert.deepEqual(createYarnCommandEnvironment({ FOO: 'bar', YARN_IGNORE_PATH: '1' }), {
    FOO: 'bar',
  })
})

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
    /Usage: yarn init @atls\/raijin/
  )
})
