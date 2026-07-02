import assert                                                 from 'node:assert/strict'
import { mkdtemp }                                            from 'node:fs/promises'
import { readFile }                                           from 'node:fs/promises'
import { writeFile }                                          from 'node:fs/promises'
import { tmpdir }                                             from 'node:os'
import { join }                                               from 'node:path'
import { PassThrough }                                        from 'node:stream'
import { test }                                               from 'node:test'

import { RaijinInitializerScaffoldTypeRequiredException } from './exceptions/scaffold-type-required.js'
import { RaijinInitializerScaffoldTypeException }             from './exceptions/scaffold-type.js'
import { RaijinInitializerUsageException }                    from './exceptions/usage.js'
import { runRaijinInitializer as runPublicRaijinInitializer } from '../index.js'
import { createSha256Digest }                                 from '../runtime/manifest.js'
import { runRaijinInitializer }                               from './index.js'
import { selectRaijinScaffoldType }                           from './scaffold.js'

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

const createFetch = (runtime: Buffer, packageManager = TEST_PACKAGE_MANAGER): typeof fetch => {
  const manifest = {
    assetName: 'yarn.mjs',
    assetUrl: 'https://github.com/atls/raijin/releases/download/%40atls%2Fraijin%401.2.3/yarn.mjs',
    packageName: '@atls/raijin',
    packageManager,
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

const EXPECTED_INITIALIZER_COMMANDS = [
  ['add', '-D', '@atls/raijin@latest'],
  ['generate', 'project', '--type', 'project'],
  ['raijin', 'sync'],
]

const noopYarnCommand = async (): Promise<void> => undefined

const collectInitializerCommands = async (
  runInitializer: typeof runRaijinInitializer,
  packageJson = false,
  argv = ['init', '--type', 'project']
): Promise<Array<Array<string>>> => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-initializer-'))
  const commands: Array<Array<string>> = []

  if (packageJson) {
    await writeFile(join(cwd, 'package.json'), '{}')
  }

  await runInitializer({
    argv,
    cwd,
    fetchImpl: createFetch(Buffer.from('runtime')),
    installSchematicArtifact: noopYarnCommand,
    runYarnCommand: async (args) => {
      commands.push(args)
    },
  })

  return commands
}

const createTerminalStream = (isTTY: boolean): PassThrough & { isTTY?: boolean } => {
  const stream = new PassThrough() as PassThrough & { isTTY?: boolean }

  stream.isTTY = isTTY

  return stream
}

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

test('should install only public Raijin package directly', async () => {
  const commands = await collectInitializerCommands(runRaijinInitializer)

  assert.deepEqual(commands[0], ['add', '-D', '@atls/raijin@latest'])
})

test('should support initializer arguments without init command', async () => {
  assert.deepEqual(
    await collectInitializerCommands(runRaijinInitializer, false, ['--type', 'project']),
    EXPECTED_INITIALIZER_COMMANDS
  )
})

test('should pass project scaffold type into schematics', async () => {
  assert.deepEqual(
    await collectInitializerCommands(runRaijinInitializer, false, ['init', '--type=project']),
    EXPECTED_INITIALIZER_COMMANDS
  )
})

test('should pass library scaffold type into schematics', async () => {
  assert.deepEqual(
    await collectInitializerCommands(runRaijinInitializer, false, ['init', '--type', 'library']),
    [
      ['add', '-D', '@atls/raijin@latest'],
      ['generate', 'project', '--type', 'library'],
      ['raijin', 'sync'],
    ]
  )
})

test('should use interactive scaffold type selector when type is omitted', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-initializer-'))
  const commands: Array<Array<string>> = []

  await runRaijinInitializer({
    argv: ['init'],
    cwd,
    fetchImpl: createFetch(Buffer.from('runtime')),
    installSchematicArtifact: noopYarnCommand,
    runYarnCommand: async (args) => {
      commands.push(args)
    },
    selectScaffoldType: async () => 'library',
  })

  assert.deepEqual(commands, [
    ['add', '-D', '@atls/raijin@latest'],
    ['generate', 'project', '--type', 'library'],
    ['raijin', 'sync'],
  ])
})

test('should select scaffold type from interactive input', async () => {
  const input = createTerminalStream(true)
  const output = createTerminalStream(true)

  const scaffoldType = selectRaijinScaffoldType({ input, output })

  input.write('2\n')

  assert.equal(await scaffoldType, 'library')
})

test('should reject scaffold type selection when interactive input closes', async () => {
  const input = createTerminalStream(true)
  const output = createTerminalStream(true)

  const scaffoldType = selectRaijinScaffoldType({ input, output })

  input.end()

  await assert.rejects(
    scaffoldType,
    (error) => error instanceof RaijinInitializerScaffoldTypeRequiredException
  )
})

test('should reject missing scaffold type without interactive terminal', async () => {
  const input = createTerminalStream(false)
  const output = createTerminalStream(false)

  await assert.rejects(
    selectRaijinScaffoldType({ input, output }),
    (error) => error instanceof RaijinInitializerScaffoldTypeRequiredException
  )
})

test('should reject unknown scaffold type', async () => {
  await assert.rejects(
    runRaijinInitializer({
      argv: ['init', '--type', 'service'],
      fetchImpl: createFetch(Buffer.from('runtime')),
      installSchematicArtifact: noopYarnCommand,
      runYarnCommand: noopYarnCommand,
    }),
    (error) => error instanceof RaijinInitializerScaffoldTypeException
  )
})

test('should create package manifest for empty project', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-initializer-'))

  await runRaijinInitializer({
    argv: ['init', '--type', 'project'],
    cwd,
    fetchImpl: createFetch(Buffer.from('runtime')),
    installSchematicArtifact: noopYarnCommand,
    runYarnCommand: noopYarnCommand,
  })

  const packageJson = await readFile(join(cwd, 'package.json'), 'utf-8')

  assert.match(packageJson, /"name": "raijin-initializer-/)
  assert.equal(JSON.parse(packageJson).packageManager, TEST_PACKAGE_MANAGER)
  assert.equal(JSON.parse(packageJson).type, 'module')
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
    argv: ['init', '--type', 'project'],
    cwd,
    fetchImpl: createFetch(Buffer.from('runtime')),
    installSchematicArtifact: noopYarnCommand,
    runYarnCommand: noopYarnCommand,
  })

  assert.deepEqual(JSON.parse(await readFile(join(cwd, 'package.json'), 'utf-8')), {
    ...manifest,
    packageManager: TEST_PACKAGE_MANAGER,
    type: 'module',
  })
})

test('should normalize package manager from runtime manifest', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-initializer-'))
  const packageManager = 'yarn@4.15.0'

  await writeFile(
    join(cwd, 'package.json'),
    `${JSON.stringify({
      name: 'wallet',
      packageManager: 'yarn@4.12.0',
    })}\n`
  )

  await runRaijinInitializer({
    argv: ['init', '--type', 'project'],
    cwd,
    fetchImpl: createFetch(Buffer.from('runtime'), packageManager),
    installSchematicArtifact: noopYarnCommand,
    runYarnCommand: noopYarnCommand,
  })

  assert.equal(
    JSON.parse(await readFile(join(cwd, 'package.json'), 'utf-8')).packageManager,
    packageManager
  )
})

test('should preserve package manifest when runtime install fails', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-initializer-'))
  const manifest = {
    name: 'wallet',
    packageManager: 'pnpm@10.12.0',
  }

  await writeFile(join(cwd, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`)

  await assert.rejects(
    runRaijinInitializer({
      argv: ['init', '--type', 'project'],
      cwd,
      fetchImpl: (async () => {
        throw new Error('Runtime manifest unavailable')
      }) as typeof fetch,
      installSchematicArtifact: noopYarnCommand,
      runYarnCommand: noopYarnCommand,
    }),
    /Runtime manifest unavailable/
  )

  assert.deepEqual(JSON.parse(await readFile(join(cwd, 'package.json'), 'utf-8')), manifest)
})

test('should create project lockfile boundary before yarn commands', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-initializer-'))

  await runRaijinInitializer({
    argv: ['init', '--type', 'project'],
    cwd,
    fetchImpl: createFetch(Buffer.from('runtime')),
    installSchematicArtifact: noopYarnCommand,
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
    argv: ['init', '--type', 'project'],
    cwd,
    fetchImpl: createFetch(Buffer.from('runtime')),
    installSchematicArtifact: noopYarnCommand,
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
