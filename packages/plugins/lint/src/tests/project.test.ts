import assert                 from 'node:assert/strict'
import { mkdir }              from 'node:fs/promises'
import { mkdtemp }            from 'node:fs/promises'
import { readFile }           from 'node:fs/promises'
import { rm }                 from 'node:fs/promises'
import { stat }               from 'node:fs/promises'
import { writeFile }          from 'node:fs/promises'
import { tmpdir }             from 'node:os'
import { join }               from 'node:path'
import { test }               from 'node:test'
import { setTimeout }         from 'node:timers/promises'

import { lintProjectSources } from '../project.js'

const createProject = async (name: string): Promise<string> =>
  mkdtemp(join(tmpdir(), `raijin-${name}-`))

test('should let ESLint own literal expansion, ignore, deduplication, fixes, and cache', async (t) => {
  const cwd = await createProject('lint-project')
  const sourceDirectory = join(cwd, 'src/[id]')
  const sourceFile = join(sourceDirectory, 'index.ts')
  const ignoredFile = join(cwd, 'ignored.ts')
  const pnpFile = join(cwd, '.pnp.cjs')
  const pnpLoaderFile = join(cwd, '.pnp.loader.mjs')
  const yarnFile = join(cwd, '.yarn/generated.ts')
  const cacheFile = join(cwd, '.config/eslint/.eslintcache')

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  await mkdir(sourceDirectory, { recursive: true })
  await mkdir(join(cwd, '.config/eslint'), { recursive: true })
  await mkdir(join(cwd, '.yarn'), { recursive: true })
  await writeFile(
    join(cwd, 'package.json'),
    `${JSON.stringify({ type: 'module', linterIgnorePatterns: ['ignored.ts'] })}\n`
  )
  await writeFile(
    join(cwd, 'tsconfig.json'),
    '{"compilerOptions":{"strict":true},"include":["src/**/*.ts","ignored.ts",".yarn/**/*.ts"]}\n'
  )
  await writeFile(
    join(cwd, 'eslint.config.mjs'),
    "export default [{ files: ['**/*.{cjs,mjs,ts}'], rules: { semi: ['error', 'always'], 'no-console': 'error' } }]\n"
  )
  await writeFile(sourceFile, "console.log('value')\n")
  await writeFile(ignoredFile, "console.log('ignored')\n")
  await writeFile(pnpFile, 'module.exports = { findPackageLocator: () => null }\n')
  await writeFile(pnpLoaderFile, "console.log('generated pnp loader')\n")
  await writeFile(yarnFile, "console.log('generated yarn')\n")

  const result = await lintProjectSources({
    rootCwd: cwd,
    cwd,
    targets: [
      'src/[id]',
      'src/[id]/index.ts',
      'ignored.ts',
      '.pnp.cjs',
      '.pnp.loader.mjs',
      '.yarn/generated.ts',
    ],
    fix: true,
    cache: true,
  })

  assert.equal(result.status, 'completed', JSON.stringify(result, undefined, 2))

  assert.equal(result.results.length, 1)
  assert.equal(result.results[0]?.filePath, sourceFile)
  assert.equal(
    result.results.some(({ filePath }) => filePath === pnpFile),
    false
  )
  assert.equal(
    result.results.some(({ filePath }) => filePath === pnpLoaderFile),
    false
  )
  assert.equal(
    result.results.some(({ filePath }) => filePath === yarnFile),
    false
  )
  assert.equal(result.results[0]?.fixedContent, "console.log('value');\n")
  assert.equal(
    result.results[0]?.diagnostics.some(({ ruleId }) => ruleId === 'no-console'),
    true
  )
  assert.match(result.output, /no-console/)
  assert.match(result.output, /1 problem/)
  assert.deepEqual(result.terminal, { exitCode: 1, reason: 'diagnostics' })
  assert.equal(await readFile(sourceFile, 'utf8'), "console.log('value');\n")
  assert.equal(await readFile(ignoredFile, 'utf8'), "console.log('ignored')\n")
  assert.equal(
    await readFile(pnpFile, 'utf8'),
    'module.exports = { findPackageLocator: () => null }\n'
  )
  assert.equal(await readFile(pnpLoaderFile, 'utf8'), "console.log('generated pnp loader')\n")
  assert.equal(await readFile(yarnFile, 'utf8'), "console.log('generated yarn')\n")
  assert.equal((await stat(cacheFile)).isFile(), true)

  await setTimeout(20)
  await writeFile(sourceFile, 'export {};\n')

  const rerun = await lintProjectSources({
    rootCwd: cwd,
    cwd,
    targets: [sourceFile],
    fix: true,
    cache: true,
  })

  assert.equal(rerun.status, 'completed')
  assert.deepEqual(
    rerun.terminal,
    { exitCode: 0, reason: 'clean' },
    JSON.stringify(rerun, undefined, 2)
  )
})

test('should lint the project directory when targets are omitted', async (t) => {
  const cwd = await createProject('lint-targetless')
  const sourceFile = join(cwd, 'index.ts')

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  await writeFile(join(cwd, 'package.json'), '{"type":"module"}\n')
  await writeFile(join(cwd, 'tsconfig.json'), '{"files":["index.ts"]}\n')
  await writeFile(sourceFile, 'export const value = 1\n')

  const result = await lintProjectSources({ rootCwd: cwd, cwd })

  assert.equal(result.status, 'completed', JSON.stringify(result, undefined, 2))

  assert.equal(
    result.results.some(({ filePath }) => filePath === sourceFile),
    true
  )
})

test('should project unmatched literal targets as provider failures', async (t) => {
  const cwd = await createProject('lint-provider-failure')

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  await writeFile(join(cwd, 'package.json'), '{"type":"module"}\n')
  await writeFile(join(cwd, 'tsconfig.json'), '{"files":[]}\n')

  const result = await lintProjectSources({ rootCwd: cwd, cwd, targets: ['missing[1].ts'] })

  assert.equal(result.status, 'provider-failed')

  assert.match(result.failure.message, /No files matching/)
  assert.match(result.failure.message, /glob was disabled/)
  assert.deepEqual(result.terminal, { exitCode: 1, reason: 'provider-failed' })
})
