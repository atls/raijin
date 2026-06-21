import assert                                                 from 'node:assert/strict'
import { mkdtemp }                                            from 'node:fs/promises'
import { readFile }                                           from 'node:fs/promises'
import { writeFile }                                          from 'node:fs/promises'
import { tmpdir }                                             from 'node:os'
import { join }                                               from 'node:path'
import { test }                                               from 'node:test'

import { RAIJIN_PACKAGE_MANAGER }                             from '../runtime/package-manager.js'
import { RaijinInitializerUsageException }                    from './exceptions/usage.js'
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
  runInitializer: typeof runRaijinInitializer,
  packageJson = false
): Promise<Array<Array<string>>> => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-initializer-'))
  const commands: Array<Array<string>> = []

  if (packageJson) {
    await writeFile(join(cwd, 'package.json'), '{}')
  }

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

const noopYarnCommand = async (): Promise<void> => undefined

test('should run initializer command sequence', async () => {
  assert.deepEqual(
    await collectInitializerCommands(runRaijinInitializer),
    EXPECTED_INITIALIZER_COMMANDS
  )
})

test('should preserve existing package initialization', async () => {
  assert.deepEqual(
    await collectInitializerCommands(runRaijinInitializer, true),
    EXPECTED_INITIALIZER_COMMANDS
  )
})

test('should expose initializer command through public index', async () => {
  assert.deepEqual(
    await collectInitializerCommands(runPublicRaijinInitializer),
    EXPECTED_INITIALIZER_COMMANDS
  )
})

test('should create package manifest for empty project', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-initializer-'))

  await runRaijinInitializer({
    argv: ['init'],
    cwd,
    fetchImpl: createFetch(Buffer.from('runtime')),
    runYarnCommand: noopYarnCommand,
  })

  const packageJson = await readFile(join(cwd, 'package.json'), 'utf-8')

  assert.match(packageJson, /"name": "raijin-initializer-/)
  assert.equal(JSON.parse(packageJson).packageManager, RAIJIN_PACKAGE_MANAGER)
})

test('should normalize package manager in existing package manifest', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-initializer-'))
  const manifest = {
    name: 'wallet',
    packageManager: 'yarn@4.12.0',
    private: true,
    scripts: {
      check: 'raijin check',
    },
  }

  await writeFile(join(cwd, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`)

  await runRaijinInitializer({
    argv: ['init'],
    cwd,
    fetchImpl: createFetch(Buffer.from('runtime')),
    runYarnCommand: noopYarnCommand,
  })

  assert.deepEqual(JSON.parse(await readFile(join(cwd, 'package.json'), 'utf-8')), {
    ...manifest,
    packageManager: RAIJIN_PACKAGE_MANAGER,
  })
})

test('should create project lockfile boundary before yarn commands', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-initializer-'))

  await runRaijinInitializer({
    argv: ['init'],
    cwd,
    fetchImpl: createFetch(Buffer.from('runtime')),
    runYarnCommand: noopYarnCommand,
  })

  assert.equal(await readFile(join(cwd, 'yarn.lock'), 'utf-8'), '')
})

test('should preserve existing project lockfile boundary', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-initializer-'))
  const lockfile = '# existing lockfile\n'

  await writeFile(join(cwd, 'package.json'), '{}')
  await writeFile(join(cwd, 'yarn.lock'), lockfile)

  await runRaijinInitializer({
    argv: ['init'],
    cwd,
    fetchImpl: createFetch(Buffer.from('runtime')),
    runYarnCommand: noopYarnCommand,
  })

  assert.equal(await readFile(join(cwd, 'yarn.lock'), 'utf-8'), lockfile)
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
