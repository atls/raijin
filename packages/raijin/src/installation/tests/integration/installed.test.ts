import type { RunRaijinInitializerOptions }       from '../../../initializer/interface.js'

import assert                                     from 'node:assert/strict'
import { execFile }                               from 'node:child_process'
import { readFile }                               from 'node:fs/promises'
import { mkdir }                                  from 'node:fs/promises'
import { mkdtemp }                                from 'node:fs/promises'
import { readdir }                                from 'node:fs/promises'
import { rm }                                     from 'node:fs/promises'
import { writeFile }                              from 'node:fs/promises'
import { tmpdir }                                 from 'node:os'
import { join }                                   from 'node:path'
import { resolve }                                from 'node:path'
import { test }                                   from 'node:test'
import { promisify }                              from 'node:util'

import { runRaijinInitializer }                   from '../../../index.js'
import { createSha256Digest }                     from '../../../runtime/manifest.js'
import { readYarnCommand }                        from '../../../yarn/command.js'
import { runYarnCommand as runNativeYarnCommand } from '../../../yarn/command.js'

const repoRoot = resolve(import.meta.dirname, '../../../../../..')
const execute = promisify(execFile)
const gitLocalVariables = (await execute('git', ['rev-parse', '--local-env-vars'])).stdout
  .trim()
  .split('\n')

const git = async (args: Array<string>, cwd: string) => {
  const environment = { ...process.env }

  for (const name of gitLocalVariables) Reflect.deleteProperty(environment, name)

  return execute('git', args, { cwd, env: environment })
}

const withLocalHooks = async (run: () => Promise<void>): Promise<void> => {
  const names = [...gitLocalVariables, 'CI', 'GITHUB_ACTIONS', 'IMAGE_PACK', 'HUSKY']
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]))

  for (const name of names) Reflect.deleteProperty(process.env, name)

  try {
    await run()
  } finally {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) Reflect.deleteProperty(process.env, name)
      else process.env[name] = value
    }
  }
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
  await runNativeYarnCommand(['workspace', '@atls/raijin', 'pack', '--out', archive], repoRoot, {
    packageManager: manifest.packageManager,
    followYarnPath: true,
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
      commandCwd,
      commandOptions
    ) => {
      const command =
        args[0] === 'add' || args[0] === 'up'
          ? ['add', '--prefer-dev', `@atls/raijin@file:${archive}`]
          : args

      await runNativeYarnCommand(command, commandCwd, commandOptions)
    }
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

    if (scaffoldType === 'member-root') {
      const memberCwd = join(cwd, 'packages/member')

      await mkdir(memberCwd, { recursive: true })
      await writeFile(
        join(cwd, 'package.json'),
        `${JSON.stringify({
          name: 'monorepo',
          private: true,
          type: 'module',
          packageManager: manifest.packageManager,
          workspaces: ['packages/*'],
          devDependencies: { '@atls/raijin': `file:${archive}` },
        })}\n`
      )
      await writeFile(join(cwd, 'yarn.lock'), '')
      await writeFile(join(memberCwd, 'package.json'), '{"name":"member"}\n')
      await runNativeYarnCommand(['install', '--no-immutable'], cwd, {
        packageManager: manifest.packageManager,
        skipInstallHooks: true,
      })

      await runRaijinInitializer({ ...options, argv: ['update'] })

      assert.equal(
        createSha256Digest(await readFile(join(cwd, '.yarn/releases/yarn.js'))),
        manifest.sha256
      )
      assert.ok((await readFile(join(cwd, '.pnp.cjs'))).length > 0)
      assert.equal((await readdir(memberCwd)).includes('.yarnrc.yml'), false)
      assert.equal((await readdir(memberCwd)).includes('yarn.lock'), false)
      await assert.rejects(
        runRaijinInitializer({ ...options, cwd: memberCwd, argv: ['update'] }),
        /package and runtime must share Yarn project root/
      )
      return
    }

    if (scaffoldType === 'separate') {
      await writeFile(join(fixtureRoot, 'package.json'), '{"name":"parent","private":true}\n')
      await writeFile(join(fixtureRoot, 'yarn.lock'), '# parent lock\n')
      await writeFile(
        join(cwd, 'package.json'),
        '{"name":"nested","devDependencies":{"@atls/raijin":"0.7.0"}}\n'
      )
      await writeFile(join(cwd, 'yarn.lock'), '')

      await runRaijinInitializer({ ...options, argv: ['update'] })

      assert.equal(
        createSha256Digest(await readFile(join(cwd, '.yarn/releases/yarn.js'))),
        manifest.sha256
      )
      assert.equal(await readFile(join(fixtureRoot, 'yarn.lock'), 'utf-8'), '# parent lock\n')
      assert.equal((await readdir(fixtureRoot)).includes('.yarnrc.yml'), false)
      return
    }

    if (scaffoldType === 'onboard') {
      await writeFile(
        join(cwd, 'package.json'),
        '{"name":"existing","type":"commonjs","scripts":{"verify":"node verify.js"}}\n'
      )
      await writeFile(join(cwd, 'tsconfig.json'), '{"compilerOptions":{"strict":false}}\n')
      await git(['init', '--quiet'], cwd)

      await withLocalHooks(async () => runRaijinInitializer({ ...options, argv: ['update'] }))

      assert.equal((await git(['config', 'core.hooksPath'], cwd)).stdout.trim(), '.config/husky/_')
      assert.equal(
        await readFile(join(cwd, '.config/husky/pre-commit'), 'utf8'),
        '# Raijin-managed hook\nyarn commit staged\n'
      )
      assert.match(await readFile(join(cwd, '.config/husky/_/h'), 'utf8'), /HUSKY-/)

      const existing = JSON.parse(await readFile(join(cwd, 'package.json'), 'utf-8')) as {
        type: string
        scripts: Record<string, string>
      }

      assert.equal(existing.type, 'commonjs')
      assert.deepEqual(existing.scripts, { verify: 'node verify.js' })
      assert.equal(
        await readFile(join(cwd, 'tsconfig.json'), 'utf-8'),
        '{"compilerOptions":{"strict":false}}\n'
      )
      assert.equal(
        await readYarnCommand(['--version'], cwd, {
          packageManager: manifest.packageManager,
          followYarnPath: true,
        }),
        '4.14.1\n'
      )
      assert.equal((await readdir(cwd)).includes('eslint.config.mjs'), false)
      return
    }

    await runRaijinInitializer({ ...options, argv: ['init', '--type', scaffoldType] })

    assert.equal(
      await readYarnCommand(['--version'], cwd, {
        packageManager: manifest.packageManager,
        followYarnPath: true,
      }),
      '4.14.1\n'
    )
    assert.ok((await readFile(join(cwd, '.pnp.cjs'))).length > 0)
    assert.equal(
      createSha256Digest(await readFile(join(cwd, '.yarn/releases/yarn.js'))),
      manifest.sha256
    )
    assert.equal(
      (await readdir(join(cwd, '.yarn/releases'))).includes('yarn.js.bootstrap.pending'),
      false
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
      assert.equal(
        await readYarnCommand(['--version'], cwd, {
          packageManager: manifest.packageManager,
          followYarnPath: true,
        }),
        '4.14.1\n'
      )
    }
    assert.equal((await readdir(join(cwd, '.yarn/releases'))).includes('yarn.js.pending'), false)
  }

  await verifyScaffoldType('project')
  await verifyScaffoldType('library')
  await verifyScaffoldType('onboard')
  await verifyScaffoldType('separate')
  await verifyScaffoldType('member-root')
})
