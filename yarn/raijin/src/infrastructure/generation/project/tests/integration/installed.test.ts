import assert        from 'node:assert/strict'
import { execFile }  from 'node:child_process'
import { copyFile }  from 'node:fs/promises'
import { mkdir }     from 'node:fs/promises'
import { mkdtemp }   from 'node:fs/promises'
import { readFile }  from 'node:fs/promises'
import { readdir }   from 'node:fs/promises'
import { rm }        from 'node:fs/promises'
import { writeFile } from 'node:fs/promises'
import { tmpdir }    from 'node:os'
import { delimiter } from 'node:path'
import { join }      from 'node:path'
import { resolve }   from 'node:path'
import { test }      from 'node:test'
import { promisify } from 'node:util'

const execute = promisify(execFile)
const repoRoot = resolve(import.meta.dirname, '../../../../../../../..')
const baselineRoot = resolve(import.meta.dirname, '../../angular/tests/fixtures/baseline')

test('installed packed collection generates both baselines and rejects an omitted collection', async (context) => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'raijin-installed-generation-'))

  context.after(async () => rm(temporaryRoot, { recursive: true, force: true }))

  const env: NodeJS.ProcessEnv = { ...process.env, GITHUB_ACTIONS: 'true' }
  const launcher = env.BERRY_BIN_FOLDER

  if (launcher && env.PATH) {
    env.PATH = env.PATH.split(delimiter)
      .filter((path) => path !== launcher)
      .join(delimiter)
  }

  for (const name of [
    'NODE_OPTIONS',
    'NODE_PATH',
    'NODE_TEST_CONTEXT',
    'BERRY_BIN_FOLDER',
    'INIT_CWD',
    'PROJECT_CWD',
    'npm_execpath',
    'npm_node_execpath',
    'YARN_IGNORE_PATH',
    'RAIJIN_CLI_INVENTORY',
    'RAIJIN_NODE_LOADER',
    'RAIJIN_NODE_LOADER_REGISTRATION',
    'RAIJIN_REGISTERED_PNP_LOADER',
  ]) {
    Reflect.deleteProperty(env, name)
  }

  const archive = join(temporaryRoot, 'raijin.tgz')

  await execute('yarn', ['workspace', '@atls/raijin', 'pack', '--out', archive], {
    cwd: repoRoot,
    env,
    maxBuffer: 16 * 1024 * 1024,
  })

  const extracted = join(temporaryRoot, 'extracted')
  const damagedArchive = join(temporaryRoot, 'raijin-missing-collection.tgz')

  await mkdir(extracted)
  await execute('tar', ['-xzf', archive, '-C', extracted])
  await rm(join(extracted, 'package/dist/generation/project/collection'), { recursive: true })
  await execute('tar', ['-czf', damagedArchive, '-C', extracted, 'package'])

  const { packageManager } = JSON.parse(await readFile(join(repoRoot, 'package.json'), 'utf8'))
  const expectedFiles = await readdir(baselineRoot)

  await Promise.all(
    [false, true].map(async (missingCollection) =>
      context.test(
        missingCollection
          ? 'missing installed collection fails without writes'
          : 'published project and library scaffolds',
        async () => {
          const cwd = join(temporaryRoot, missingCollection ? 'damaged' : 'installed')
          const fixtureRuntime = join(cwd, '.yarn/releases/yarn.mjs')

          await mkdir(join(cwd, '.yarn/releases'), { recursive: true })
          await copyFile(join(repoRoot, '.yarn/releases/yarn.mjs'), fixtureRuntime)
          await copyFile(missingCollection ? damagedArchive : archive, join(cwd, 'raijin.tgz'))
          await writeFile(
            join(cwd, 'package.json'),
            JSON.stringify({
              name: 'installed-generation',
              private: true,
              type: 'module',
              packageManager,
              dependencies: { '@atls/raijin': 'file:./raijin.tgz' },
            })
          )
          await writeFile(
            join(cwd, '.yarnrc.yml'),
            'nodeLinker: pnp\npnpEnableEsmLoader: true\nyarnPath: .yarn/releases/yarn.mjs\n'
          )
          await execute(process.execPath, [fixtureRuntime, 'install', '--no-immutable'], {
            cwd,
            env,
            maxBuffer: 16 * 1024 * 1024,
          })
          assert.ok((await readFile(join(cwd, '.pnp.cjs'))).length > 0)

          await Promise.all(
            ['project', 'library'].map(async (scaffoldType) => {
              const target = join(cwd, scaffoldType)

              await mkdir(target)

              const generation = execute(
                process.execPath,
                [fixtureRuntime, 'generate', 'project', '--type', scaffoldType],
                {
                  cwd: target,
                  env,
                }
              )

              if (missingCollection) {
                await assert.rejects(generation, (error: unknown) => {
                  assert.ok(error instanceof Error)
                  assert.equal(Reflect.get(error, 'code'), 1)
                  assert.match(
                    String(Reflect.get(error, 'stdout')) + String(Reflect.get(error, 'stderr')),
                    /Installed @atls\/raijin project collection is unavailable: declared collection does not exist/
                  )

                  return true
                })
                assert.deepEqual(await readdir(target), [])

                return
              }

              const { stdout } = await generation

              assert.match(stdout, /CREATE \/eslint.config.mjs/)
              assert.deepEqual(
                (await readdir(target)).sort(),
                expectedFiles.map((path) => path.replace(/\.fixture$/u, '')).sort()
              )
              await Promise.all(
                expectedFiles.map(async (fixture) => {
                  const path = fixture.replace(/\.fixture$/u, '')
                  const actual = await readFile(join(target, path), 'utf8')
                  const expected = await readFile(join(baselineRoot, fixture), 'utf8')

                  if (path === 'tsconfig.json') {
                    assert.deepEqual(JSON.parse(actual), JSON.parse(expected))
                  } else {
                    assert.equal(actual, expected, path)
                  }
                })
              )
              await execute(
                process.execPath,
                [
                  fixtureRuntime,
                  'node',
                  '--input-type=module',
                  '-e',
                  "await import('./.prettierrc.mjs'); await import('./eslint.config.mjs')",
                ],
                { cwd: target, env }
              )
            })
          )
        }
      ))
  )
})
