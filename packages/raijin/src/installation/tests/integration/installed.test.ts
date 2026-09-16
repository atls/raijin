import type { RunRaijinInitializerOptions }       from '../../../initializer/interface.js'

import assert                                     from 'node:assert/strict'
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

import { runRaijinInitializer }                   from '../../../index.js'
import { createSha256Digest }                     from '../../../runtime/manifest.js'
import { readYarnCommand }                        from '../../../yarn/command.js'
import { runYarnCommand as runNativeYarnCommand } from '../../../yarn/command.js'

const repoRoot = resolve(import.meta.dirname, '../../../../../..')

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

    if (scaffoldType === 'onboard') {
      await writeFile(
        join(cwd, 'package.json'),
        '{"name":"existing","type":"commonjs","scripts":{"verify":"node verify.js"}}\n'
      )
      await writeFile(join(cwd, 'tsconfig.json'), '{"compilerOptions":{"strict":false}}\n')

      await runRaijinInitializer({ ...options, argv: ['update'] })

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
})
