import type { YarnCommandRunner } from '../yarn/runner.js'

import assert                     from 'node:assert/strict'
import { access }                 from 'node:fs/promises'
import { mkdir }                  from 'node:fs/promises'
import { mkdtemp }                from 'node:fs/promises'
import { readFile }               from 'node:fs/promises'
import { rm }                     from 'node:fs/promises'
import { writeFile }              from 'node:fs/promises'
import { tmpdir }                 from 'node:os'
import { join }                   from 'node:path'
import { test }                   from 'node:test'

import { createSha256Digest }     from '../runtime/release.js'
import { runRaijinInitializer }   from './index.js'

const runtime = Buffer.from('runtime')
const releaseFixture = {
  assetName: 'yarn.js',
  assetUrl: 'https://github.com/atls/raijin/releases/download/%40atls%2Fraijin%401.2.3/yarn.js',
  packageIntegrity: 'sha512-YWJjZA==',
  packageManager: 'yarn@4.14.1',
  packageName: '@atls/raijin',
  sha256: createSha256Digest(runtime),
  sourceRevision: 'a'.repeat(40),
  tagName: '@atls/raijin@1.2.3',
  version: '1.2.3',
}

const fetchImpl = (async (input: Request | URL | string) => {
  const url = input instanceof Request ? input.url : String(input)

  if (url.startsWith('https://registry.npmjs.org/')) {
    return Response.json({
      name: releaseFixture.packageName,
      'dist-tags': { latest: releaseFixture.version },
      versions: {
        [releaseFixture.version]: {
          name: releaseFixture.packageName,
          version: releaseFixture.version,
          gitHead: releaseFixture.sourceRevision,
          dist: { integrity: releaseFixture.packageIntegrity },
        },
      },
    })
  }

  if (url.includes('/releases/tags/')) {
    return Response.json({
      tag_name: releaseFixture.tagName,
      draft: false,
      prerelease: false,
      assets: [
        {
          name: releaseFixture.assetName,
          state: 'uploaded',
          digest: `sha256:${releaseFixture.sha256}`,
          browser_download_url: releaseFixture.assetUrl,
        },
      ],
    })
  }

  if (url.includes('/commits/')) {
    return Response.json({ sha: releaseFixture.sourceRevision })
  }

  if (url.includes('/contents/package.json')) {
    return Response.json({ packageManager: releaseFixture.packageManager })
  }

  return new Response(new Uint8Array(runtime))
}) as typeof fetch

const queryYarnPackage = async () => ({
  name: releaseFixture.packageName,
  version: releaseFixture.version,
  gitHead: releaseFixture.sourceRevision,
  dist: { integrity: releaseFixture.packageIntegrity },
})

const readYarnCommand = async (args: Array<string>): Promise<string> =>
  args[0] === '--version'
    ? '4.14.1\n'
    : JSON.stringify({ name: releaseFixture.packageName, version: releaseFixture.version })

const exists = async (path: string): Promise<boolean> => {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

test('bootstrap installs exact package before runtime activation and scaffolds once', async (context) => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-install-'))
  context.after(async () => rm(cwd, { recursive: true, force: true }))
  const commands: Array<Array<string>> = []
  const runYarnCommand: YarnCommandRunner = async (args, _commandCwd, options) => {
    commands.push(args)

    if (args[0] === 'add') {
      assert.deepEqual(options, { packageManager: 'yarn@4.14.1', skipInstallHooks: true })
      assert.equal(await exists(join(cwd, '.yarn/releases/yarn.js')), false)
      assert.equal(await exists(join(cwd, '.yarn/releases/yarn.js.bootstrap.pending')), true)
      assert.equal(await exists(join(cwd, '.yarnrc.yml')), false)
    } else if (args[0] === 'generate') {
      assert.deepEqual(options, { packageManager: 'yarn@4.14.1', followYarnPath: true })
    }
  }

  await runRaijinInitializer({
    argv: ['init', '--type', 'library'],
    cwd,
    fetchImpl,
    queryYarnPackage,
    readYarnCommand,
    runYarnCommand,
  })

  assert.deepEqual(commands, [
    ['add', '--prefer-dev', '-E', '@atls/raijin@1.2.3'],
    ['generate', 'project', '--type', 'library'],
  ])
  assert.equal(await readFile(join(cwd, '.yarn/releases/yarn.js'), 'utf-8'), 'runtime')
  assert.equal(await exists(join(cwd, '.yarn/releases/yarn.js.bootstrap.pending')), false)
  assert.deepEqual(JSON.parse(await readFile(join(cwd, '.yarn/releases/package.json'), 'utf-8')), {
    type: 'module',
  })
})

test('an older installed package updates to npm latest without changing project configuration', async (context) => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-update-'))
  context.after(async () => rm(cwd, { recursive: true, force: true }))
  const packageJson = {
    name: 'consumer',
    type: 'commonjs',
    packageManager: 'yarn@4.12.0',
    devDependencies: { '@atls/raijin': '0.7.0' },
    scripts: { verify: 'node verify.js' },
  }
  const userConfig = 'nodeLinker: node-modules\nenableGlobalCache: false\n'
  const commands: Array<Array<string>> = []

  await writeFile(join(cwd, 'package.json'), `${JSON.stringify(packageJson)}\n`)
  await writeFile(join(cwd, '.yarnrc.yml'), userConfig)
  await writeFile(join(cwd, 'tsconfig.json'), '{"compilerOptions":{"strict":false}}\n')
  await writeFile(join(cwd, 'eslint.config.mjs'), 'export default []\n')

  await runRaijinInitializer({
    argv: ['update'],
    cwd,
    fetchImpl,
    queryYarnPackage,
    readYarnCommand,
    runYarnCommand: async (args) => {
      commands.push(args)
    },
  })

  assert.deepEqual(commands[0], ['up', '-E', '@atls/raijin@1.2.3'])
  assert.equal(
    commands.some((args) => args[0] === 'generate'),
    false
  )
  assert.equal(
    commands.some((args) => args[0] === 'install'),
    false
  )
  assert.deepEqual(JSON.parse(await readFile(join(cwd, 'package.json'), 'utf-8')), {
    ...packageJson,
    packageManager: 'yarn@4.14.1',
  })
  assert.equal(
    await readFile(join(cwd, 'tsconfig.json'), 'utf-8'),
    '{"compilerOptions":{"strict":false}}\n'
  )
  assert.equal(await readFile(join(cwd, 'eslint.config.mjs'), 'utf-8'), 'export default []\n')
  const yarnrc = await readFile(join(cwd, '.yarnrc.yml'), 'utf-8')
  assert.match(yarnrc, /nodeLinker: node-modules/)
  assert.match(yarnrc, /enableGlobalCache: false/)
  assert.match(yarnrc, /yarnPath: .yarn\/releases\/yarn.js/)
  assert.equal(await exists(join(cwd, 'yarn.lock')), true)
})

test('member-only package cannot split its Yarn project runtime', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'raijin-member-'))
  context.after(async () => rm(root, { recursive: true, force: true }))
  const cwd = join(root, 'packages/member')
  const memberManifest = '{"name":"member","devDependencies":{"@atls/raijin":"0.7.0"}}\n'

  await mkdir(cwd, { recursive: true })
  await writeFile(
    join(root, 'package.json'),
    '{"name":"root","private":true,"workspaces":["packages/*"]}\n'
  )
  await writeFile(join(root, 'yarn.lock'), '')
  await writeFile(join(cwd, 'package.json'), memberManifest)

  await assert.rejects(
    runRaijinInitializer({ argv: ['update'], cwd, fetchImpl }),
    /run update from that root, which must declare @atls\/raijin/
  )

  assert.equal(await exists(join(cwd, 'yarn.lock')), false)
  assert.equal(await exists(join(cwd, '.yarn')), false)
  assert.equal(await exists(join(cwd, '.yarnrc.yml')), false)
  assert.equal(await exists(join(root, '.yarn/releases/yarn.js')), false)
  assert.equal(await exists(join(root, '.yarnrc.yml')), false)
  assert.equal(await readFile(join(root, 'yarn.lock'), 'utf-8'), '')
  assert.equal(await readFile(join(cwd, 'package.json'), 'utf-8'), memberManifest)

  const newMemberCwd = join(root, 'packages/new-member')

  await mkdir(newMemberCwd)
  await writeFile(join(newMemberCwd, 'package.json'), '{"name":"new-member"}\n')
  await assert.rejects(
    runRaijinInitializer({
      argv: ['init', '--type', 'project'],
      cwd: newMemberCwd,
      fetchImpl,
    }),
    /cannot scaffold a member workspace/
  )
  assert.equal(await exists(join(newMemberCwd, 'yarn.lock')), false)
})

test('non-member nested package is rejected without creating a lockfile', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'raijin-nonmember-'))
  context.after(async () => rm(root, { recursive: true, force: true }))
  const cwd = join(root, 'child')

  await mkdir(cwd)
  await writeFile(join(root, 'package.json'), '{"name":"root","private":true}\n')
  await writeFile(join(root, 'yarn.lock'), '')
  await writeFile(
    join(cwd, 'package.json'),
    '{"name":"child","devDependencies":{"@atls/raijin":"0.7.0"}}\n'
  )

  await assert.rejects(
    runRaijinInitializer({ argv: ['update'], cwd, fetchImpl }),
    /not a member workspace/
  )

  assert.equal(await exists(join(cwd, 'yarn.lock')), false)
  assert.equal(await exists(join(cwd, '.yarn')), false)

  const bootstrapCwd = join(root, 'new-project')

  await mkdir(bootstrapCwd)
  await assert.rejects(
    runRaijinInitializer({
      argv: ['init', '--type', 'project'],
      cwd: bootstrapCwd,
      fetchImpl,
    }),
    /bootstrap target is nested beneath Yarn project/
  )
  assert.equal(await exists(join(bootstrapCwd, 'package.json')), false)
  assert.equal(await exists(join(bootstrapCwd, 'yarn.lock')), false)
})

test('nested project with its own lockfile updates only its own runtime', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'raijin-nested-root-'))
  context.after(async () => rm(root, { recursive: true, force: true }))
  const cwd = join(root, 'child')
  const commands: Array<Array<string>> = []

  await mkdir(cwd)
  await writeFile(join(root, 'package.json'), '{"name":"root","private":true}\n')
  await writeFile(join(root, 'yarn.lock'), '# parent lock\n')
  await writeFile(
    join(cwd, 'package.json'),
    '{"name":"child","devDependencies":{"@atls/raijin":"0.7.0"}}\n'
  )
  await writeFile(join(cwd, 'yarn.lock'), '# child lock\n')

  await runRaijinInitializer({
    argv: ['update'],
    cwd,
    fetchImpl,
    queryYarnPackage,
    readYarnCommand,
    runYarnCommand: async (args) => {
      commands.push(args)
    },
  })

  assert.equal(commands[0][0], 'up')
  assert.equal(await exists(join(cwd, '.yarn/releases/yarn.js')), true)
  assert.equal(await exists(join(root, '.yarnrc.yml')), false)
  assert.equal(await readFile(join(root, 'yarn.lock'), 'utf-8'), '# parent lock\n')
  assert.equal(await readFile(join(cwd, 'yarn.lock'), 'utf-8'), '# child lock\n')
})

test('update onboards an existing package without creating a scaffold', async (context) => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-onboard-'))
  context.after(async () => rm(cwd, { recursive: true, force: true }))
  const packageJson = { name: 'existing', type: 'commonjs', scripts: { verify: 'node verify.js' } }
  const commands: Array<Array<string>> = []

  await writeFile(join(cwd, 'package.json'), `${JSON.stringify(packageJson)}\n`)
  await writeFile(join(cwd, 'tsconfig.json'), '{"compilerOptions":{"strict":false}}\n')

  await runRaijinInitializer({
    argv: ['update'],
    cwd,
    fetchImpl,
    queryYarnPackage,
    readYarnCommand,
    runYarnCommand: async (args) => {
      commands.push(args)
    },
  })

  assert.deepEqual(commands, [['add', '--prefer-dev', '-E', '@atls/raijin@1.2.3']])
  assert.deepEqual(JSON.parse(await readFile(join(cwd, 'package.json'), 'utf-8')), {
    ...packageJson,
    packageManager: 'yarn@4.14.1',
  })
  assert.equal(
    await readFile(join(cwd, 'tsconfig.json'), 'utf-8'),
    '{"compilerOptions":{"strict":false}}\n'
  )
})

test('metadata mismatch leaves the configured package and runtime untouched', async (context) => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-mismatch-'))
  context.after(async () => rm(cwd, { recursive: true, force: true }))
  const packageJson = '{"devDependencies":{"@atls/raijin":"0.7.0"}}\n'

  await writeFile(join(cwd, 'package.json'), packageJson)

  await assert.rejects(
    runRaijinInitializer({
      argv: ['update'],
      cwd,
      fetchImpl,
      readYarnCommand,
      queryYarnPackage: async () => ({ ...(await queryYarnPackage()), gitHead: 'b'.repeat(40) }),
      runYarnCommand: async () => {
        throw new Error('Yarn must not run')
      },
    }),
    /metadata does not match/
  )

  await assert.rejects(
    runRaijinInitializer({
      argv: ['update'],
      cwd,
      fetchImpl,
      readYarnCommand,
      queryYarnPackage: async () => ({
        ...(await queryYarnPackage()),
        dist: { integrity: 'sha512-ZWZnaA==' },
      }),
      runYarnCommand: async () => {
        throw new Error('Yarn must not run')
      },
    }),
    /metadata does not match/
  )

  assert.equal(await readFile(join(cwd, 'package.json'), 'utf-8'), packageJson)
  assert.equal(await exists(join(cwd, '.yarn')), false)
})

test('missing release asset and wrong runtime digest stop update before changing the project', async (context) => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-release-asset-'))
  context.after(async () => rm(cwd, { recursive: true, force: true }))
  const packageJson = '{"devDependencies":{"@atls/raijin":"0.7.0"}}\n'

  await writeFile(join(cwd, 'package.json'), packageJson)

  const assertStopsBeforeChange = async (
    assets: Array<Record<string, string>>,
    expectedError: RegExp
  ): Promise<void> => {
    const invalidReleaseFetch = (async (input: Request | URL | string, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input)

      return url.includes('/releases/tags/')
        ? Response.json({
            tag_name: releaseFixture.tagName,
            draft: false,
            prerelease: false,
            assets,
          })
        : fetchImpl(input, init)
    }) as typeof fetch

    await assert.rejects(
      runRaijinInitializer({
        argv: ['update'],
        cwd,
        fetchImpl: invalidReleaseFetch,
        queryYarnPackage,
        readYarnCommand,
        runYarnCommand: async () => {
          throw new Error('Yarn must not run')
        },
      }),
      expectedError
    )

    assert.equal(await readFile(join(cwd, 'package.json'), 'utf8'), packageJson)
    assert.equal(await exists(join(cwd, '.yarn')), false)
  }

  await assertStopsBeforeChange([], /no checked yarn.js asset/)
  await assertStopsBeforeChange(
    [
      {
        name: releaseFixture.assetName,
        state: 'uploaded',
        digest: `sha256:${'b'.repeat(64)}`,
        browser_download_url: releaseFixture.assetUrl,
      },
    ],
    /digest mismatch/
  )
})

test('incompatible runtime module scope fails before Yarn changes the package', async (context) => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-scope-'))
  context.after(async () => rm(cwd, { recursive: true, force: true }))
  await writeFile(join(cwd, 'package.json'), '{"devDependencies":{"@atls/raijin":"0.7.0"}}\n')
  await mkdir(join(cwd, '.yarn/releases'), { recursive: true })
  await writeFile(join(cwd, '.yarn/releases/package.json'), '{"type":"commonjs"}\n')

  await assert.rejects(
    runRaijinInitializer({
      argv: ['update'],
      cwd,
      fetchImpl,
      queryYarnPackage,
      readYarnCommand,
      runYarnCommand: async () => {
        throw new Error('Yarn must not run')
      },
    }),
    /not type module/
  )

  assert.equal(await exists(join(cwd, '.yarn/releases/yarn.js.pending')), false)
})

test('wrong active runtime version remains staged and cannot report success', async (context) => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-version-'))
  context.after(async () => rm(cwd, { recursive: true, force: true }))
  await writeFile(join(cwd, 'package.json'), '{"devDependencies":{"@atls/raijin":"0.7.0"}}\n')

  await assert.rejects(
    runRaijinInitializer({
      argv: ['update'],
      cwd,
      fetchImpl,
      queryYarnPackage,
      readYarnCommand: async (args) =>
        args[0] === '--version'
          ? '4.12.0\n'
          : JSON.stringify({ name: releaseFixture.packageName, version: releaseFixture.version }),
      runYarnCommand: async () => undefined,
    }),
    /staged at/
  )

  assert.equal(await exists(join(cwd, '.yarn/releases/yarn.js.pending')), true)
})

test('failed Yarn install exposes one retryable staged runtime without activation', async (context) => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-retry-'))
  context.after(async () => rm(cwd, { recursive: true, force: true }))
  await writeFile(join(cwd, 'package.json'), '{"devDependencies":{"@atls/raijin":"0.7.0"}}\n')
  await mkdir(join(cwd, '.yarn/releases'), { recursive: true })
  await writeFile(join(cwd, '.yarn/releases/yarn.js'), 'old-runtime')
  await writeFile(join(cwd, '.yarnrc.yml'), 'yarnPath: .yarn/releases/yarn.js\n')
  let fail = true
  const runYarnCommand: YarnCommandRunner = async (args) => {
    if (args[0] === 'up' && fail) {
      throw new Error('install failed')
    }
  }
  const options = {
    argv: ['update'],
    cwd,
    fetchImpl,
    queryYarnPackage,
    readYarnCommand,
    runYarnCommand,
  }

  await assert.rejects(runRaijinInitializer(options), /staged at/)
  assert.equal(await readFile(join(cwd, '.yarn/releases/yarn.js'), 'utf-8'), 'old-runtime')
  assert.equal(await readFile(join(cwd, '.yarn/releases/yarn.js.pending'), 'utf-8'), 'runtime')

  fail = false
  await runRaijinInitializer(options)
  assert.equal(await readFile(join(cwd, '.yarn/releases/yarn.js'), 'utf-8'), 'runtime')
  assert.equal(await exists(join(cwd, '.yarn/releases/yarn.js.pending')), false)
})

test('retrying init after package add completes the still-pending scaffold', async (context) => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-bootstrap-retry-'))
  context.after(async () => rm(cwd, { recursive: true, force: true }))
  const commands: Array<Array<string>> = []
  let rejectVersion = true

  const options = {
    argv: ['init', '--type', 'project'],
    cwd,
    fetchImpl,
    queryYarnPackage,
    readYarnCommand: async (args: Array<string>): Promise<string> => {
      if (args[0] === '--version') {
        return rejectVersion ? '4.0.0\n' : '4.14.1\n'
      }

      return JSON.stringify({ name: releaseFixture.packageName, version: releaseFixture.version })
    },
    runYarnCommand: async (args: Array<string>): Promise<void> => {
      commands.push(args)

      if (args[0] === 'add') {
        const project = JSON.parse(await readFile(join(cwd, 'package.json'), 'utf-8')) as Record<
          string,
          unknown
        >

        await writeFile(
          join(cwd, 'package.json'),
          `${JSON.stringify({
            ...project,
            devDependencies: { '@atls/raijin': '1.2.3' },
          })}\n`
        )
      }
    },
  }

  await assert.rejects(runRaijinInitializer(options), /staged at/)
  assert.equal(await exists(join(cwd, '.yarn/releases/yarn.js.bootstrap.pending')), true)
  assert.equal(
    commands.some((args) => args[0] === 'generate'),
    false
  )
  await assert.rejects(
    runRaijinInitializer({ ...options, argv: ['update'] }),
    /rerun init to finish the scaffold/
  )

  rejectVersion = false
  await runRaijinInitializer(options)

  assert.equal(commands.filter((args) => args[0] === 'generate').length, 1)
  assert.equal(await exists(join(cwd, '.yarn/releases/yarn.js.bootstrap.pending')), false)
})
