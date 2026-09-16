import type { RunRaijinInitializerOptions } from '../../../initializer/interface.js'

import assert                               from 'node:assert/strict'
import { execFile }                         from 'node:child_process'
import { readFile }                         from 'node:fs/promises'
import { mkdir }                            from 'node:fs/promises'
import { mkdtemp }                          from 'node:fs/promises'
import { readdir }                          from 'node:fs/promises'
import { rm }                               from 'node:fs/promises'
import { writeFile }                        from 'node:fs/promises'
import { tmpdir }                           from 'node:os'
import { delimiter }                        from 'node:path'
import { join }                             from 'node:path'
import { resolve }                          from 'node:path'
import { test }                             from 'node:test'
import { promisify }                        from 'node:util'

import { runRaijinInitializer }             from '../../../index.js'
import { createSha256Digest }               from '../../../runtime/manifest.js'

const execute = promisify(execFile)
const repoRoot = resolve(import.meta.dirname, '../../../../../..')

const createEnvironment = (): NodeJS.ProcessEnv => {
  const environment: NodeJS.ProcessEnv = { ...process.env, GITHUB_ACTIONS: 'true' }
  const berryBinFolder = environment.BERRY_BIN_FOLDER

  if (berryBinFolder && environment.PATH) {
    environment.PATH = environment.PATH.split(delimiter)
      .filter((path) => path !== berryBinFolder)
      .join(delimiter)
  }

  for (const name of [
    'NODE_OPTIONS',
    'NODE_PATH',
    'BERRY_BIN_FOLDER',
    'YARN_IGNORE_PATH',
    'INIT_CWD',
    'PROJECT_CWD',
    'npm_execpath',
    'npm_node_execpath',
  ]) {
    Reflect.deleteProperty(environment, name)
  }

  return environment
}

test('packed Raijin package and checked runtime bootstrap project and library, then update safely', async (context) => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), 'raijin-installed-initializer-'))
  context.after(async () => rm(fixtureRoot, { recursive: true, force: true }))
  const archive = join(fixtureRoot, 'raijin.tgz')
  const runtime = await readFile(join(repoRoot, '.yarn/releases/yarn.js'))
  const packageJson = JSON.parse(
    await readFile(join(repoRoot, 'packages/raijin/package.json'), 'utf-8')
  ) as {
    version: string
  }
  const { version } = packageJson
  const manifest = {
    assetName: 'yarn.js',
    assetUrl: `https://github.com/atls/raijin/releases/download/%40atls%2Fraijin%40${version}/yarn.js`,
    packageIntegrity: 'sha512-YWJjZA==',
    packageManager: 'yarn@4.14.1',
    packageName: '@atls/raijin',
    schemaVersion: 2,
    sha256: createSha256Digest(runtime),
    sourceRevision: 'a'.repeat(40),
    tagName: `@atls/raijin@${version}`,
    version,
  }
  const environment = createEnvironment()

  await execute('yarn', ['workspace', '@atls/raijin', 'pack', '--out', archive], {
    cwd: repoRoot,
    env: environment,
    maxBuffer: 16 * 1024 * 1024,
  })

  const verifyScaffoldType = async (scaffoldType: string): Promise<void> => {
    const cwd = join(fixtureRoot, scaffoldType)

    await mkdir(cwd)
    const fetchImpl = (async (input: Request | URL | string) => {
      const url = input instanceof Request ? input.url : String(input)

      return url.endsWith('raijin-runtime.json')
        ? Response.json(manifest)
        : new Response(new Uint8Array(runtime))
    }) as typeof fetch
    const runYarnCommand: NonNullable<RunRaijinInitializerOptions['runYarnCommand']> = async (
      args,
      commandCwd
    ) => {
      const command =
        args[0] === 'add' || args[0] === 'up'
          ? ['add', '--prefer-dev', `@atls/raijin@file:${archive}`]
          : args

      await execute('yarn', command, {
        cwd: commandCwd,
        env: environment,
        maxBuffer: 16 * 1024 * 1024,
      })
    }
    const readYarnCommand: NonNullable<RunRaijinInitializerOptions['readYarnCommand']> = async (
      args,
      commandCwd
    ) =>
      (
        await execute('yarn', args, {
          cwd: commandCwd,
          env: environment,
          maxBuffer: 16 * 1024 * 1024,
        })
      ).stdout
    const options: RunRaijinInitializerOptions = {
      cwd,
      fetchImpl,
      queryYarnPackage: async () => ({
        name: manifest.packageName,
        version: manifest.version,
        gitHead: manifest.sourceRevision,
        dist: { integrity: manifest.packageIntegrity },
      }),
      readYarnCommand,
      runYarnCommand,
    }

    await runRaijinInitializer({ ...options, argv: ['init', '--type', scaffoldType] })

    assert.equal(await readYarnCommand(['--version'], cwd), '4.14.1\n')
    assert.ok((await readFile(join(cwd, '.pnp.cjs'))).length > 0)
    assert.equal(
      createSha256Digest(await readFile(join(cwd, '.yarn/releases/yarn.js'))),
      manifest.sha256
    )
    assert.ok((await readdir(cwd)).includes('tsconfig.json'))

    const tsconfig = await readFile(join(cwd, 'tsconfig.json'))

    if (scaffoldType === 'library') {
      const projectManifest = JSON.parse(
        await readFile(join(cwd, 'package.json'), 'utf-8')
      ) as Record<string, unknown>

      await writeFile(
        join(cwd, 'package.json'),
        `${JSON.stringify({ ...projectManifest, type: 'commonjs' })}\n`
      )
    }

    await runRaijinInitializer({ ...options, argv: ['update'] })

    assert.deepEqual(await readFile(join(cwd, 'tsconfig.json')), tsconfig)
    if (scaffoldType === 'library') {
      const projectManifest = JSON.parse(await readFile(join(cwd, 'package.json'), 'utf-8')) as {
        type: string
      }

      assert.equal(projectManifest.type, 'commonjs')
      assert.equal(await readYarnCommand(['--version'], cwd), '4.14.1\n')
    }
    assert.equal((await readdir(join(cwd, '.yarn/releases'))).includes('yarn.js.pending'), false)
  }

  await verifyScaffoldType('project')
  await verifyScaffoldType('library')
})
