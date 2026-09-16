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

import { createSha256Digest }     from '../runtime/manifest.js'
import { runRaijinInitializer }   from './index.js'

const runtime = Buffer.from('runtime')
const manifest = {
  assetName: 'yarn.js',
  assetUrl: 'https://github.com/atls/raijin/releases/download/%40atls%2Fraijin%401.2.3/yarn.js',
  packageIntegrity: 'sha512-YWJjZA==',
  packageManager: 'yarn@4.14.1',
  packageName: '@atls/raijin',
  schemaVersion: 2,
  sha256: createSha256Digest(runtime),
  sourceRevision: 'a'.repeat(40),
  tagName: '@atls/raijin@1.2.3',
  version: '1.2.3',
}

const fetchImpl = (async (input: Request | URL | string) => {
  const url = input instanceof Request ? input.url : String(input)

  return url.endsWith('raijin-runtime.json')
    ? Response.json(manifest)
    : new Response(new Uint8Array(runtime))
}) as typeof fetch

const queryYarnPackage = async () => ({
  name: manifest.packageName,
  version: manifest.version,
  gitHead: manifest.sourceRevision,
  dist: { integrity: manifest.packageIntegrity },
})

const readYarnCommand = async (args: Array<string>): Promise<string> =>
  args[0] === '--version'
    ? '4.14.1\n'
    : JSON.stringify({ name: manifest.packageName, version: manifest.version })

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
  const runYarnCommand: YarnCommandRunner = async (args) => {
    commands.push(args)

    if (args[0] === 'add') {
      assert.equal(await exists(join(cwd, '.yarn/releases/yarn.js')), false)
      assert.equal(await exists(join(cwd, '.yarn/releases/yarn.js.pending')), true)
      assert.equal(await exists(join(cwd, '.yarnrc.yml')), false)
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
  assert.equal(await exists(join(cwd, '.yarn/releases/yarn.js.pending')), false)
  assert.deepEqual(JSON.parse(await readFile(join(cwd, '.yarn/releases/package.json'), 'utf-8')), {
    type: 'module',
  })
})

test('configured update preserves project configuration and does not scaffold', async (context) => {
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

  assert.equal(commands[0][0], 'up')
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

  assert.equal(await readFile(join(cwd, 'package.json'), 'utf-8'), packageJson)
  assert.equal(await exists(join(cwd, '.yarn')), false)
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
          : JSON.stringify({ name: manifest.packageName, version: manifest.version }),
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
