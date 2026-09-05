import assert from 'node:assert/strict'
import { access, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'

import {
  createFixture,
  execute,
  fixtureEnvironment,
  repoRoot,
  runtimePath,
} from './consumers/fixture.mjs'
import { prepareSurface } from './consumers/surface/prepare.mjs'
import { prepareProjectGeneration } from './consumers/project-generation/prepare.mjs'
import { verifyProjectGeneration } from './consumers/project-generation/verify.mjs'
import { prepareStagedProjects } from './consumers/staged-projects/prepare.mjs'
import { verifyStagedProjects } from './consumers/staged-projects/verify.mjs'

/** @type {string | undefined} */
let archiveRoot
/** @type {string} */
let archivePath
/** @type {string} */
let expectedVersion

before(async () => {
  archiveRoot = await mkdtemp(join(tmpdir(), 'raijin-consumer-archive-'))
  archivePath = join(archiveRoot, 'atls-raijin.tgz')
  const environment = fixtureEnvironment()
  expectedVersion = (
    await execute(process.execPath, [runtimePath, '--version'], repoRoot, {
      ...environment,
      YARN_IGNORE_PATH: '1',
    })
  ).trim()
  await execute(
    'yarn',
    ['workspace', '@atls/raijin', 'pack', '--out', archivePath],
    repoRoot,
    environment
  )
})

after(async () => {
  if (archiveRoot) await rm(archiveRoot, { recursive: true, force: true })
})

test('surface', async (t) => {
  const { cwd, runYarn } = await createFixture(t, archivePath, {
    'fixture-prettier-config': 'portal:./prettier-config',
  })
  await prepareSurface(cwd)
  await runYarn(['install', '--no-immutable'])
  assert.equal((await runYarn(['--version'])).trim(), expectedVersion)
  await access(join(cwd, '.pnp.cjs'))

  await t.test('command help and PnP formatter configuration', async () => {
    await Promise.all(
      [['check'], ['generate', 'project'], ['raijin', 'sync']].map(async (args) => {
        assert.ok((await runYarn([...args, '--help'])).includes(`yarn ${args.join(' ')}`))
      })
    )
    await runYarn(['format', 'source.ts'])
    assert.equal(await readFile(join(cwd, 'source.ts'), 'utf8'), 'export const value = "test";\n')
  })

  const target = join(cwd, 'packages/target')
  await t.test('all project tests stay inside the workspace', async () => {
    const output = await runYarn(['test', '--test-reporter=tap'], target)
    assert.match(output, /fixture-target-unit/)
    assert.match(output, /fixture-target-integration/)
    assert.doesNotMatch(output, /fixture-sibling-must-not-run/)
  })
  await t.test('unit test selection', async () => {
    const output = await runYarn(['test', 'unit', '--test-reporter=tap'], target)
    assert.match(output, /fixture-target-unit/)
    assert.doesNotMatch(output, /fixture-target-integration|fixture-sibling-must-not-run/)
  })
  await t.test('integration test selection', async () => {
    const output = await runYarn(['test', 'integration', '--test-reporter=tap'], target)
    assert.match(output, /fixture-target-integration/)
    assert.doesNotMatch(output, /fixture-target-unit|fixture-sibling-must-not-run/)
  })
})

test('project-generation', async (t) => {
  const { cwd, runYarn } = await createFixture(t, archivePath)
  await prepareProjectGeneration(cwd)
  await runYarn(['install', '--no-immutable'])
  assert.equal((await runYarn(['--version'])).trim(), expectedVersion)
  await access(join(cwd, '.pnp.cjs'))
  const generated = join(cwd, 'packages/generated')

  await t.test('installed collection generates the expected scaffold', async () => {
    assert.match(
      await runYarn(['generate', 'project', '--type', 'project'], generated),
      /CREATE \/eslint.config.mjs/
    )
    await verifyProjectGeneration(generated)
  })
  await t.test('unsupported scaffold fails', async () => {
    await assert.rejects(
      runYarn(['generate', 'project', '--type', 'service'], join(cwd, 'packages/invalid')),
      (error) => {
        assert.ok(error instanceof Error)
        assert.match(
          [Reflect.get(error, 'stdout'), Reflect.get(error, 'stderr')].join(''),
          /Unsupported project scaffold type "service"/
        )
        return true
      }
    )
  })
})

test('staged-projects', async (t) => {
  const environment = fixtureEnvironment()
  delete environment.GITHUB_ACTIONS
  delete environment.IMAGE_PACK
  const fixture = await createFixture(t, archivePath, { typescript: '5.9.3' }, environment)
  await prepareStagedProjects(fixture)
  await fixture.runYarn(['install', '--no-immutable'])
  assert.equal((await fixture.runYarn(['--version'])).trim(), expectedVersion)
  await verifyStagedProjects(t, fixture)
})
